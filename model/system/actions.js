var async = require('async');
var php   = require('phpjs');
var _     = require('underscore');

module.exports = function(app) {

    var _log      = app.system.logger;
    var mongoose  = app.core.mongo.mongoose;
    var ObjectId  = mongoose.Schema.Types.ObjectId;
    var Inspector = app.lib.inspector;
    var query     = app.lib.query;
    var workerId  = parseInt(process.env.worker_id);

    var Schema = {
        ap : {type: ObjectId, typeStr: 'ObjectId', required: true, ref: 'System_Apps', alias: 'apps'},
        r  : {type: ObjectId, typeStr: 'ObjectId', required: true, ref: 'System_Roles', alias: 'roles'},
        o  : {type: ObjectId, typeStr: 'ObjectId', required: true, ref: 'System_Objects', alias: 'objects'},
        a  : [{type: String, typeStr: 'String', required: true, enum: ['get', 'post', 'put', 'delete'], alias: 'action'}]
    };

    Schema.ap.settings = {
        initial: false
    };

    Schema.r.settings = {
        label: 'Role',
        display: 'name'
    };

    Schema.o.settings = {
        label: 'Object',
        display: 'name'
    };

    Schema.a[0].settings = {
        label: 'Action',
        options: [
            {label: 'Get', value: 'get'},
            {label: 'Post', value: 'post'},
            {label: 'Put', value: 'put'},
            {label: 'Delete', value: 'delete'}
        ]
    };

    var inspector    = new Inspector(Schema).init();
    var ActionSchema = app.core.mongo.db.Schema(Schema);

    // plugins
    ActionSchema.plugin(query);

    // inspector
    ActionSchema.inspector = inspector;

    // compound index
    ActionSchema.index({ap: 1, r: 1, o: 1}, {unique: true});

    // model options
    ActionSchema.inspector.Options = {
        singular : 'System Action',
        plural   : 'System Actions',
        columns  : ['roles', 'objects', 'action'],
        main     : 'action',
        perpage  : 25
    };

    ActionSchema.pre('save', function (next) {
        var self = this;
        self._isNew = self.isNew;
        next();
    });

    // init acl role
    ActionSchema.post('save', function (doc) {
        var self = this;
        doc      = doc.toJSON();

        if(app.acl) {
            var Apps    = mongoose.model('System_Apps');
            var Roles   = mongoose.model('System_Roles');
            var Objects = mongoose.model('System_Objects');

            var a = {};

            a['role'] = function(cb) {
                Roles.findById(doc.r, function (err, role) {
                   cb(err, role);
                });
            };

            a['object'] = function(cb) {
                Objects.findById(doc.o, function (err, object) {
                   cb(err, object);
                });
            };

            async.parallel(a, function(err, results) {
                if(err)
                    return _log.error(err);

                if( ! results || ! results['role'] || ! results['object'] )
                    return _log.info('role or object not found');

                var role    = results['role'];
                var object  = results['object'];
                var roleApp = role.ap.toString();
                var objApp  = object.ap.toString();

                /**
                 * @TODO
                 * system objelerine erişim izni gereken uygulamalarda bu kontrol izin vermiyor
                 * (uygulama ile sistem ayrı application)
                 */

                // if(roleApp != objApp)
                //    return _log.info('app id is not same for role and object');

                Apps.findById(roleApp, function (err, apps) {
                    if( err || ! apps )
                        return _log.info('app not found');

                    var roleName = apps.s+'_'+role.s;
                    var objName  = object.s.replace('.', '_');

                    if(self._isNew) {
                        app.acl.allow(roleName, objName, doc.a);
                        return _log.info('[acl:allow] '+roleName+':'+objName+':'+doc.a);
                    }

                    var _original = self._original.a;
                    var _new      = doc.a;

                    // new actions
                    var newActions = php.array_diff(_new, _original);
                    newActions     = _.map(Object.keys(newActions), function(key) { return newActions[key]; });

                    if(newActions.length) {
                        app.acl.allow(roleName, objName, newActions);
                        _log.info('[acl:allow] '+roleName+':'+objName+':'+newActions);
                    }

                    // old actions
                    var oldActions = php.array_diff(_original, _new);
                    oldActions     = _.map(Object.keys(oldActions), function(key) { return oldActions[key]; });

                    if(oldActions.length) {
                        app.acl.removeAllow(roleName, objName, oldActions);
                        _log.info('[acl:removeAllow] '+roleName+':'+objName+':'+oldActions);
                    }
                });
            });
        }
    });

    // delete acl role
    ActionSchema.post('remove', function (doc) {
        var self = this;
        doc      = doc.toJSON();

        if(app.acl) {
            var Apps    = mongoose.model('System_Apps');
            var Roles   = mongoose.model('System_Roles');
            var Objects = mongoose.model('System_Objects');

            var a = {};

            a['role'] = function(cb) {
                Roles.findById(doc.r, function (err, role) {
                    cb(err, role);
                });
            };

            a['object'] = function(cb) {
                Objects.findById(doc.o, function (err, object) {
                    cb(err, object);
                });
            };

            async.parallel(a, function(err, results) {
                if(err)
                    return _log.error(err);

                if( ! results || ! results['role'] || ! results['object'] )
                    return _log.info('role or object not found');

                var role    = results['role'];
                var object  = results['object'];
                var roleApp = role.ap.toString();
                var objApp  = object.ap.toString();

                /**
                 * @TODO
                 * system objelerine erişim izni gereken uygulamalarda bu kontrol izin vermiyor
                 * (uygulama ile sistem ayrı application)
                 */

                // if(roleApp != objApp)
                //    return _log.info('app id is not same for role and object');

                Apps.findById(roleApp, function (err, apps) {
                    if( err || ! apps )
                        return _log.info('app not found');

                    var roleName = apps.s+'_'+role.s;
                    var objName  = object.s.replace('.', '_');

                    app.acl.removeAllow(roleName, objName, doc.a);
                    _log.info('[acl:removeAllow] '+roleName+':'+objName+':'+doc.a);
                });
            });
        }
    });

    // allow superadmin (mongoose connection bekliyor)
    mongoose.connection.on('open', function() {
        if(app.acl && workerId == 0) {
            app.acl.allow('superadmin', 'system_actions', '*');
            _log.info('[acl:allow] superadmin:system_actions:*');
        }
    });

    return mongoose.model('System_Actions', ActionSchema);

};



