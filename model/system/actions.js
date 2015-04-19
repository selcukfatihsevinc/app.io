var async = require('async');
var php   = require('phpjs');
var dot   = require('dotty');
var _     = require('underscore');

module.exports = function(app) {

    var _env      = app.get('env');
    var _log      = app.system.logger;
    var mongoose  = app.core.mongo.mongoose;
    var ObjectId  = mongoose.Schema.Types.ObjectId;
    var Inspector = app.lib.inspector;
    var query     = app.lib.query;
    var workerId  = parseInt(process.env.worker_id);
    var emitter   = app.lib.schemaEmitter;
    var syncConf  = app.config[_env].sync;

    var Schema = {
        ap  : {type: ObjectId, typeStr: 'ObjectId', required: true, ref: 'System_Apps', alias: 'apps'},
        r   : {type: ObjectId, typeStr: 'ObjectId', required: true, ref: 'System_Roles', alias: 'roles'},
        rna : {type: String, typeStr: 'String', alias: 'roles_name'},
        o   : {type: ObjectId, typeStr: 'ObjectId', required: true, ref: 'System_Objects', alias: 'objects'},
        ona : {type: String, typeStr: 'String', alias: 'objects_name'},
        a   : [{type: String, typeStr: 'String', required: true, enum: ['get', 'post', 'put', 'delete'], alias: 'action'}],
        m   : [{type: String, typeStr: 'String', enum: ['get*', 'post*', 'put*', 'delete*'], alias: 'master'}]
    };

    Schema.ap.settings = {initial: false};

    Schema.r.settings = {
        label: 'Role',
        display: 'name'
    };

    Schema.rna.settings = {initial: false};

    Schema.o.settings = {
        label: 'Object',
        display: 'name'
    };

    Schema.ona.settings = {initial: false};

    Schema.a[0].settings = {
        label: 'Action',
        options: [
            {label: 'Get', value: 'get'},
            {label: 'Post', value: 'post'},
            {label: 'Put', value: 'put'},
            {label: 'Delete', value: 'delete'}
        ]
    };

    Schema.m[0].settings = {
        label: 'Master',
        options: [
            {label: 'Get', value: 'get*'},
            {label: 'Post', value: 'post*'},
            {label: 'Put', value: 'put*'},
            {label: 'Delete', value: 'delete*'}
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
        columns  : ['roles', 'objects', 'action', 'master'],
        main     : 'action',
        perpage  : 25
    };

    /**
     * Denormalization
     */

    var denorm = [
        {ref: 'System_Roles', source: 'r', fields: {rna: 'n'}},
        {ref: 'System_Objects', source: 'o', fields: {ona: 'n'}}
    ];

    emitter.on('role_updated', function(role) {
        app.lib.denormalize.update('System_Actions', 'System_Roles', role.doc, denorm);
    });

    emitter.on('object_updated', function(object) {
        app.lib.denormalize.update('System_Actions', 'System_Objects', object.doc, denorm);
    });

    if(workerId == 0 && dot.get(syncConf, 'denormalize.system_actions')) {
        // lib modelden önce çalıştığı için hemen çalıştırınca schema register olmuyor, 5sn sonra çalıştır
        setTimeout(function() {
            app.lib.denormalize.sync('System_Actions');
        }, 5000);
    }

    ActionSchema.pre('save', function (next) {

        var self = this;
        self._isNew = self.isNew;

        app.lib.denormalize.fill(this, denorm, function() {
            next();
        });

    });

    // init acl role
    ActionSchema.post('save', function (doc) {
        var self = this;
        doc      = doc.toJSON();

        if(app.acl) {
            if( ! self._original )
                return _log.info('action original data not found');

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

                        if(doc.m.length) {
                            app.acl.allow(roleName, objName, doc.m);
                            _log.info('[acl:allow] '+roleName+':'+objName+':'+doc.m);
                        }

                        return _log.info('[acl:allow] '+roleName+':'+objName+':'+doc.a);
                    }

                    /**
                     * actions
                     */

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

                    /**
                     * master
                     */
                    var _orgm = self._original.m;
                    var _newm = doc.m;

                    // new actions
                    var newMaster = php.array_diff(_newm, _orgm);
                    newMaster     = _.map(Object.keys(newMaster), function(key) { return newMaster[key]; });

                    if(newMaster.length) {
                        app.acl.allow(roleName, objName, newMaster);
                        _log.info('[acl:allow] '+roleName+':'+objName+':'+newMaster);
                    }

                    // old actions
                    var oldMaster = php.array_diff(_orgm, _newm);
                    oldMaster     = _.map(Object.keys(oldMaster), function(key) { return oldMaster[key]; });

                    if(oldMaster.length) {
                        app.acl.removeAllow(roleName, objName, oldMaster);
                        _log.info('[acl:removeAllow] '+roleName+':'+objName+':'+oldMaster);
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

                    if(doc.m.length) {
                        app.acl.removeAllow(roleName, objName, doc.m);
                        _log.info('[acl:removeAllow] '+roleName+':'+objName+':'+doc.m);
                    }
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



