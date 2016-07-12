var async  = require('async');
var crypto = require('crypto');
var uuid   = require('node-uuid');
var php    = require('phpjs');
var _      = require('underscore');

module.exports = function(app) {

    var _env      = app.get('env');
    var _log      = app.lib.logger;
    var _mongoose = app.core.mongo.mongoose;
    var _query    = app.lib.query;
    var _emitter  = app.lib.schemaEmitter;
    var _helper   = app.lib.utils.helper;
    var _group    = 'MODEL:system.users';

    // types
    var ObjectId  = _mongoose.Schema.Types.ObjectId;
    var Mixed     = _mongoose.Schema.Types.Mixed;

    /**
     * ----------------------------------------------------------------
     * Schema
     * ----------------------------------------------------------------
     */

    var Schema = {
        ap  : [{type: ObjectId, ref: 'System_Apps', alias: 'apps'}],
        em  : {type: String, required: true, alias: 'email', pattern: 'email', unique: true},
        pa  : {type: String, optional: false, alias: 'password'}, // save'de required: true, update'de required: false gibi davranması için optional: false olarak işaretlendi
        na  : {type: String, alias: 'name', index: true}, // for backward compatibility
        sa  : {type: String, alias: 'salt'},
        ha  : {type: String, alias: 'hash'},
        ie  : {type: String, default: 'Y', enum: ['Y', 'N'], alias: 'is_enabled', index: true},
        ty  : {type: String, default: 'U', enum: ['U', 'A'], alias: 'type', index: true}, // U: User, A: Admin
        ro  : [{type: ObjectId, ref: 'System_Roles', alias: 'roles'}],
        ca  : {type: Date, alias: 'created_at', default: Date.now},
        rgt : {type: String, alias: 'register_token', index: true},
        rt  : {type: String, alias: 'reset_token', index: true},
        re  : {type: Date, alias: 'reset_expires'},
        ii  : {type: String, default: 'N', enum: ['Y', 'N'], alias: 'is_invited', index: true},
        inv : {type: ObjectId, ref: 'System_Users', alias: 'inviter'},
        ll  : {type: Date, alias: 'last_login', index: true},
        ws  : {type: String, default: 'AC', enum: ['WA', 'AC', 'DC'], alias: 'waiting_status', index: true},
        pc  : {type: String, default: 'N', enum: ['Y', 'N'], alias: 'password_changed'},
        pca : {type: Date, alias: 'password_changed_at'}
    };

    /**
     * ----------------------------------------------------------------
     * Settings
     * ----------------------------------------------------------------
     */

    Schema.ap[0].settings = {label: 'Apps', display: 'name'};
    Schema.em.settings    = {label: 'Email'};
    Schema.pa.settings    = {label: 'Password'};
    Schema.na.settings    = {label: 'Name'};
    Schema.ie.settings    = {
        label: 'Is Enabled ?',
        options: [
            {label: 'Yes', value: 'Y'},
            {label: 'No', value: 'N'}
        ]
    };

    Schema.ty.settings = {
        label: 'Type',
        options: [
            {label: 'User', value: 'U'},
            {label: 'Admin', value: 'A'}
        ]
    };

    Schema.ro[0].settings = {label: 'Roles', display: 'name'};

    Schema.ii.settings = {
        initial: false,
        options: [
            {label: 'Yes', value: 'Y'},
            {label: 'No', value: 'N'}
        ]
    };
	
    Schema.ws.settings = {
        initial: false,
        options: [
            {label: 'Waiting', value: 'WA'},
            {label: 'Accepted', value: 'AC'},
            {label: 'Declined', value: 'DC'}
        ]
    };

	Schema.ll.settings = {initial: false, label: 'Last Login'};
	Schema.ca.settings = {initial: false, label: 'Created At'};
    
    /**
     * ----------------------------------------------------------------
     * Load Schema
     * ----------------------------------------------------------------
     */

    var UserSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'System_Users',
        Options: {
            singular : 'System User',
            plural   : 'System Users',
            columns  : ['email', 'roles', 'apps', 'last_login', 'created_at'],
            main     : 'email',
            perpage  : 25,
	        sort     : '-_id'
        }
    });

    // plugins
    UserSchema.plugin(_query);
    // console.log(UserSchema.inspector.Save.properties);

	UserSchema.index({ap: 1});
	
    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    UserSchema.pre('save', function (next) {
        var self = this;

        // unique durumunu korumak için email hep küçük harf olarak kaydedilecek
        self.em = self.em.toLowerCase();

        // yeni kullanıcı veya güncelleme durumunda password hash'i kaydediyoruz
        if( ! php.empty(self.pa) ) {
            self.sa = uuid.v1();
            self.ha = _helper.hash(self.pa, self.sa);
            self.pa = '';
        }

        self._isNew     = self.isNew;
        self._lastLogin = self.isModified('ll');
        
        next();
    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    UserSchema.post('save', function (doc) {
        var self = this;

        // emit event (last_login güncellemesi ise işlem yapma)
        if( ! self._isNew && ! self._lastLogin ) {
            _emitter.emit('system_users_updated', {
                source: 'System_Users',
                doc: doc
            });
        }

        var roles = [];
        doc       = doc.toJSON();
        var id    = doc._id.toString();

        // mevcut kaydedilen roller
        if(doc.ro.length) {
            doc.ro = _helper.mapToString(doc.ro);
            roles.push(doc.ro);
        }

        // kaydedilmeden önceki roller
        if(self._original && self._original.ro) {
            self._original.ro = _helper.mapToString(self._original.ro);
            roles.push(self._original.ro);
        }

        // role id'lerini unique array haline getiriyoruz
        roles = _.union.apply(_, roles);
        roles = _helper.mapToString(roles);
        roles = _.uniq(roles);

        var Apps  = _mongoose.model('System_Apps');
        var Roles = _mongoose.model('System_Roles');
        var a;

        if(roles) {
            a = {
                roles: function(cb) {
                    // rolleri alırken superadmin olmayanlar için işlem yapacağız
                    Roles.find({_id: {$in: roles}, s: {$ne: 'superadmin'}}).exec(function(err, roles) {
                        cb(err, roles);
                    });
                }
            };

            async.parallel(a, function(err, results) {
                if(err)
                    return _log.error(err);

                if( ! results || ! results['roles'] || ! results['roles'].length )
                    return _log.info('roles not found');

                var roleData = results['roles'];

                // collect app ids from role data
                var apps = [];
                _.each(roleData, function(value, key) {
                    apps.push(value.ap.toString());
                });

                // get apps data
                Apps.find({_id: {$in: apps}}).exec(function(err, apps) {
                    if( err || ! apps )
                        return _log.info('apps not found');

                    // use apps _id as key
                    var appsObj = {};
                    apps.forEach(function (doc) {
                        appsObj[doc._id.toString()] = doc;
                    });

                    // acl'e parametre olarak role id yerine role slug vereceğiz
                    // (node_acl'den sorgularken anlamlı olması için)
                    var rolesObj = {};

                    // use roles _id as key, appSlug_roleSlug as value
                    _.each(roleData, function(value, key) {
                        rolesObj[value._id.toString()] = appsObj[value.ap.toString()].s+'_'+value.s;
                    });

                    var _role_name = function(obj, rolesObj) {
                        return _.map(obj, function(key) { return rolesObj[key]; });
                    };

                    /**
                     * yeni kayıt durumunda rolleri ekliyoruz
                     */

                    if(self._isNew) {
                        if (app.acl && doc.ro.length) {
                            doc.ro = _role_name(doc.ro, rolesObj);

                            if(doc.ro) {
                                app.acl.addUserRoles(doc._id.toString(), doc.ro);
                                return _log.info('ACL:ADD_USER_ROLES:'+doc._id, doc.ro);
                            }
                        }

                        return;
                    }

                    /**
                     * update durumunda rolleri güncelliyoruz
                     */

                    // new roles (role slug'larını alıyoruz)
                    var newRoles = php.array_diff(doc.ro, self._original.ro);
                    newRoles     = _.map(Object.keys(newRoles), function(key) { return newRoles[key]; });
                    newRoles     = _role_name(newRoles, rolesObj);

                    if(app.acl && newRoles.length) {
                        app.acl.addUserRoles(doc._id.toString(), newRoles);
                        _log.info('ACL:ADD_USER_ROLES:'+doc._id, newRoles);
                    }

                    // old roles (role slug'larını alıyoruz)
                    var oldRoles = php.array_diff(self._original.ro, doc.ro);
                    oldRoles     = _.map(Object.keys(oldRoles), function(key) { return oldRoles[key]; });
                    oldRoles     = _role_name(oldRoles, rolesObj);

                    if(app.acl && oldRoles.length) {
                        app.acl.removeUserRoles(doc._id.toString(), oldRoles);
                        _log.info('ACL:REMOVE_USER_ROLES:'+doc._id, oldRoles);
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

    UserSchema.post('remove', function (doc) {
        var self = this;
        doc      = doc.toJSON();
        var id   = doc._id.toString();

        // kayıt silinmesi durumunda rolleri siliyoruz
        if (app.acl && doc.ro.length) {
            doc.ro = _helper.mapToString(doc.ro);

            var Apps  = _mongoose.model('System_Apps');
            var Roles = _mongoose.model('System_Roles');

            var a = {
                roles: function(cb) {
                    Roles.find({_id: {$in: doc.ro}}).exec(function(err, roles) {
                        cb(err, roles);
                    });
                }
            };

            async.parallel(a, function(err, results) {
                if(err)
                    return _log.error(err);

                if( ! results || ! results['roles'] )
                    return _log.info('roles not found (remove)');

                var roleData = results['roles'];

                // collect app ids from role data
                var apps = [];
                _.each(roleData, function(value, key) {
                    apps.push(value.ap.toString());
                });

                // get apps data
                Apps.find({_id: {$in: apps}}).exec(function(err, apps) {
                    if (err || !apps)
                        return _log.info('apps not found');

                    // use apps _id as key
                    var appsObj = {};
                    apps.forEach(function (doc) {
                        appsObj[doc._id.toString()] = doc;
                    });

                    var rolesObj = {};

                    // use roles _id as key, appSlug_roleSlug as value
                    _.each(roleData, function(value, key) {
                        rolesObj[value._id] = appsObj[value.ap.toString()].s+'_'+value.s;
                    });

                    doc.ro = _.map(doc.ro, function(key) { return rolesObj[key]; });
                    app.acl.removeUserRoles(doc._id.toString(), doc.ro);
                    _log.info('ACL:REMOVE_USER_ROLES:'+doc._id, doc.ro);
                });
            });
        }
    });

    return _mongoose.model('System_Users', UserSchema);

};



