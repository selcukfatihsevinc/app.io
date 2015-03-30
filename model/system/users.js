var async  = require('async');
var crypto = require('crypto');
var uuid   = require('node-uuid');
var php    = require('phpjs');
var _      = require('underscore');

module.exports = function(app) {

    var _log      = app.system.logger;
    var mongoose  = app.core.mongo.mongoose;
    var ObjectId  = mongoose.Schema.Types.ObjectId;
    var Inspector = app.lib.inspector;
    var query     = app.lib.query;
    var workerId  = parseInt(process.env.worker_id);

    var Schema = {
        ap : {type: ObjectId, required: true, ref: 'System_Apps', alias: 'apps'},
        na : {type: String, required: true, alias: 'name'},
        em : {type: String, required: true, alias: 'email', pattern: 'email'},
        pa : {type: String, optional: false, alias: 'password'}, // save'de required: true, update'de required: false gibi davranması için optional: false olarak işaretlendi
        sa : {type: String, alias: 'salt'},
        ha : {type: String, alias: 'hash'},
        ie : {type: String, default: 'Y', enum: ['Y', 'N'], alias: 'is_enabled'},
        ty : {type: String, default: 'U', enum: ['U', 'A'], alias: 'type', index: true}, // U: User, A: Admin
        ro : [{type: ObjectId, ref: 'System_Roles', alias: 'roles'}],
        ca : {type: Date, alias: 'created_at', default: Date.now},
        uf : {type: String, alias: 'url_field'},
        rt : {type: String, alias: 'reset_token'},
        re : {type: Date, alias: 'reset_expires'}
    };

    Schema.ap.settings = {initial: false};
    Schema.na.settings = {label: 'Name'};
    Schema.em.settings = {label: 'Email'};
    Schema.pa.settings = {label: 'Password'};
    Schema.sa.settings = {initial: false};
    Schema.ha.settings = {initial: false};

    Schema.ie.settings = {
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

    Schema.ro[0].settings = {
        label: 'Roles',
        display: 'name'
    };

    Schema.ca.settings = {initial: false};
    Schema.uf.settings = {initial: false};
    Schema.rt.settings = {initial: false};
    Schema.re.settings = {initial: false};

    var inspector  = new Inspector(Schema).init();
    var UserSchema = app.core.mongo.db.Schema(Schema);

    // plugins
    UserSchema.plugin(query);

    // inspector
    UserSchema.inspector = inspector;

    // compound index
    UserSchema.index({ap: 1, em: 1}, {unique: true});

    // model options
    UserSchema.inspector.Options = {
        singular : 'User',
        plural   : 'Users',
        columns  : ['name', 'email'],
        main     : 'name',
        perpage  : 25
    };

    // schema owner
    UserSchema.owner = {
        field   : '_id',
        protect : true
    };

    var hash = function(passwd, salt) {
        return crypto.createHmac('sha256', salt).update(passwd).digest('hex');
    };

    UserSchema.pre('save', function (next) {
        var self = this;

        // yeni kullanıcı veya güncelleme durumunda password hash'i kaydediyoruz
        if( ! php.empty(self.pa) ) {
            self.sa = uuid.v1();
            self.ha = hash(self.pa, self.sa);
            self.pa = '';
        }

        self._isNew = self.isNew;

        next();
    });

    var _unique_objects = function(doc, original, key) {

    };

    UserSchema.post('save', function (doc) {
        var self  = this;
        var roles = [];
        doc       = doc.toJSON();
        var id    = doc._id.toString();

        // mevcut kaydedilen roller
        if(doc.ro.length) {
            doc.ro = _.map(doc.ro, function(obj) { return obj.toString(); });
            roles.push(doc.ro);
        }

        // kaydedilmeden önceki roller
        if(self._original) {
            if(self._original.ro) {
                self._original.ro = _.map(self._original.ro, function(obj) { return obj.toString(); });
                roles.push(self._original.ro);
            }
        }

        // roles id'lerini unique array haline getiriyoruz
        roles = _.union.apply(_, roles);
        roles = _.map(roles, function(obj) { return obj.toString(); });
        roles = _.uniq(roles);

        var Apps  = mongoose.model('System_Apps');
        var Roles = mongoose.model('System_Roles');
        var a;

        if(roles) {
            a = {};

            // app data'sını alıyoruz
            a['app'] = function(cb) {
                Apps.findById(doc.ap, function (err, apps) {
                    cb(err, apps);
                });
            };

            a['roles'] = function(cb) {
                // rolleri alırken superadmin olmayanlar için işlem yapacağız
                // kullanıcı app id'si ile aynı olan roller üzerinde işlem yapıyoruz
                Roles.find({_id: {$in: roles}, s: {$ne: 'superadmin'}, ap: doc.ap}).exec(function(err, roles) {
                    cb(err, roles);
                });
            };

            async.parallel(a, function(err, results) {
                if(err)
                    return _log.error(err);

                if( ! results || ! results['app'] || ! results['roles'] || ! results['roles'].length )
                    return _log.info('app or roles not found');

                var appData  = results['app'];
                var roleData = results['roles'];

                // acl'e parametre olarak role id yerine role slug vereceğiz
                // (node_acl'den sorgularken anlamlı olması için)
                var rolesObj = {};

                _.each(roleData, function(value, key) {
                    rolesObj[value._id.toString()] = appData.s+'_'+value.s;
                });

                var _role_name = function(obj) {
                    return _.map(obj, function(key) { return rolesObj[key]; });
                };

                // yeni kayıt durumunda rolleri ekliyoruz
                if(self._isNew) {
                    if (app.acl && doc.ro.length) {
                        doc.ro = _role_name(doc.ro);

                        if(doc.ro) {
                            app.acl.addUserRoles(doc._id.toString(), doc.ro);
                            return _log.info('[acl:addUserRoles] new user acl roles: '+doc.ro);
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
                newRoles     = _role_name(newRoles);

                if(app.acl && newRoles.length) {
                    app.acl.addUserRoles(doc._id.toString(), newRoles);
                    _log.info('[acl:addUserRoles] current user new acl roles: '+newRoles);
                }

                // old roles (role slug'larını alıyoruz)
                var oldRoles = php.array_diff(self._original.ro, doc.ro);
                oldRoles     = _.map(Object.keys(oldRoles), function(key) { return oldRoles[key]; });
                oldRoles     = _role_name(oldRoles);

                if(app.acl && oldRoles.length) {
                    _log.info('[acl:removeUserRoles] current user old acl roles: '+oldRoles);
                    app.acl.removeUserRoles(doc._id.toString(), oldRoles);
                }
            });
        }

        // add default user role
        if(app.acl && self._isNew) {
            a = {};

            // app data'sını alıyoruz
            a['app'] = function(cb) {
                Apps.findById(doc.ap, function (err, apps) {
                    cb(err, apps);
                });
            };

            a['roles'] = function(cb) {
                Roles.findOne({s: 'user', ap: doc.ap}).exec(function(err, role) {
                    cb(err, role);
                });
            };

            async.parallel(a, function(err, results) {
                if(err)
                    return _log.error(err);

                if( ! results || ! results['app'] || ! results['roles'] )
                    return _log.info('app or roles not found (save)');

                var appData  = results['app'];
                var roleData = results['roles'];

                app.acl.addUserRoles(id, appData.s+'_user');
                _log.info('[acl:addUserRoles] add default user role');
            });
        }
    });

    UserSchema.post('remove', function (doc) {
        var self = this;
        doc      = doc.toJSON();
        var id   = doc._id.toString();

        // kayıt silinmesi durumunda rolleri siliyoruz
        if (app.acl && doc.ro.length) {
            doc.ro = _.map(doc.ro, function(obj) { return obj.toString(); });

            var Apps  = mongoose.model('System_Apps');
            var Roles = mongoose.model('System_Roles');

            var a = {};

            // app data'sını alıyoruz
            a['app'] = function(cb) {
                Apps.findById(doc.ap, function (err, apps) {
                    cb(err, apps);
                });
            };

            a['roles'] = function(cb) {
                Roles.find({_id: {$in: doc.ro}}).exec(function(err, roles) {
                    cb(err, roles);
                });
            };

            async.parallel(a, function(err, results) {
                if(err)
                    return _log.error(err);

                if( ! results || ! results['app'] || ! results['roles'] )
                    return _log.info('app or roles not found (remove)');

                var appData  = results['app'];
                var roleData = results['roles'];

                var rolesObj = {};

                _.each(roleData, function(value, key) {
                    rolesObj[value._id] = appData.s+'_'+value.s;
                });

                doc.ro = _.map(doc.ro, function(key) { return rolesObj[key]; });
                app.acl.removeUserRoles(doc._id.toString(), doc.ro);
                _log.info('[acl:removeUserRoles] old user acl roles: '+doc.ro);
            });
        }
    });

    // allow superadmin (mongoose connection bekliyor)
    mongoose.connection.on('open', function() {
        if(app.acl && workerId == 0) {
            app.acl.allow('superadmin', 'system_users', '*');
            _log.info('[acl:allow] superadmin:system_users:*');
        }
    });

    // tmp users
    mongoose.model('Tmp_Users', UserSchema);

    return mongoose.model('System_Users', UserSchema);

};



