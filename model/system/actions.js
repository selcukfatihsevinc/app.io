var async = require('async');
var php   = require('phpjs');
var dot   = require('dotty');
var _     = require('underscore');

module.exports = function(app) {

    var _env      = app.get('env');
    var _log      = app.lib.logger;
    var _mongoose = app.core.mongo.mongoose;
    var _query    = app.lib.query;
    var _emitter  = app.lib.schemaEmitter;
    var _group    = 'MODEL:system.actions';

    // types
    var ObjectId  = _mongoose.Schema.Types.ObjectId;
    var Mixed     = _mongoose.Schema.Types.Mixed;

    /**
     * ----------------------------------------------------------------
     * Schema
     * ----------------------------------------------------------------
     */

    var Schema = {
        ap  : {type: ObjectId, required: true, ref: 'System_Apps', alias: 'apps'},
        r   : {type: ObjectId, required: true, ref: 'System_Roles', alias: 'roles'},
        o   : {type: ObjectId, required: true, ref: 'System_Objects', alias: 'objects'},
        a   : [{type: String, required: true, enum: ['get', 'post', 'put', 'delete'], alias: 'action'}],
        m   : [{type: String, enum: ['get*', 'post*', 'put*', 'delete*'], alias: 'master'}]
    };

    /**
     * ----------------------------------------------------------------
     * Settings
     * ----------------------------------------------------------------
     */

    Schema.r.settings = {label: 'Role', display: 'name'};
    Schema.o.settings = {label: 'Object', display: 'name'};

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

    /**
     * ----------------------------------------------------------------
     * Load Schema
     * ----------------------------------------------------------------
     */

    var ActionSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'System_Actions',
        Options: {
            singular : 'System Action',
            plural   : 'System Actions',
            columns  : ['roles', 'objects', 'action', 'master'],
            main     : 'action',
            perpage  : 25
        }
    });

    // plugins
    ActionSchema.plugin(_query);

    // compound index
    ActionSchema.index({ap: 1, r: 1, o: 1}, {unique: true});

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    ActionSchema.pre('save', function (next) {

        var self = this;
        self._isNew = self.isNew;
        next();

    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    ActionSchema.post('save', function (doc) {
        var self = this;
        doc      = doc.toJSON();

        if(app.acl) {
            var Apps    = _mongoose.model('System_Apps');
            var Roles   = _mongoose.model('System_Roles');
            var Objects = _mongoose.model('System_Objects');

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
                     * @TODO
                     * aşağıdaki actions ve master işlemlerinde _original data gerekiyor, yoksa işlem yapmıyoruz
                     */

                    if( ! self._original )
                        return _log.info('action original data not found !!!');

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

    /**
     * ----------------------------------------------------------------
     * Post Remove Hook
     * ----------------------------------------------------------------
     */

    ActionSchema.post('remove', function (doc) {
        var self = this;
        doc      = doc.toJSON();

        if(app.acl) {
            var Apps    = _mongoose.model('System_Apps');
            var Roles   = _mongoose.model('System_Roles');
            var Objects = _mongoose.model('System_Objects');

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

    return _mongoose.model('System_Actions', ActionSchema);

};



