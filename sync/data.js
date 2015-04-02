var dot   = require('dotty');
var async = require('async');
var _     = require('underscore');

module.exports = function(app) {

    var _log    = app.system.logger;
    var _env    = app.get('env');
    var _schema = app.lib.schema;
    var _c      = app.config[_env];

    if(parseInt(process.env.worker_id) != 0)
        return false;

    // create default roles
    var a = {};

    /**
     * save or get apps
     */

    var apps = _c.apps.list;

    _.each(apps, function(value, key) {
        (function(a, value, key) {
            a['app_'+value.slug] = function(cb) {
                var schema = new _schema('system.apps').init(app);
                var _v     = _.clone(value);

                schema.post(value, function(err, apps) {
                    if( ! err && apps ) {
                        schema = _v = null;
                        return cb(err, apps);
                    }

                    schema.get({slug: _v.slug, qt: 'one'}, function(err, apps) {
                        schema = _v = null;
                        cb(err, apps);
                    });
                });
            };
        })(a, value, key);
    });

    function guestRole(role, currApp) {
        if(role.slug == 'guest') {
            app.acl.addUserRoles('guest', currApp.slug+'_guest');
            _log.info('[acl:addUserRoles] guest user acl created for '+currApp.name);
        }
    }

    // execute parallel
    async.parallel(a, function(err, apps) {
        // console.log(apps);

        a = {};

        /**
         * save or get roles
         */

        _.each(_c.roles, function(value, key) {
            var currApp = apps['app_'+key];

            if( ! currApp )
                return;

            // get app id
            var currId = currApp._id.toString();

            // roles
            var roles = value.default;

            _.each(roles, function(role_value, role_key) {
                (function(a, key, role_value, role_key, currId, currApp) {
                    a['role_'+key+'.'+role_value.slug] = function(cb) {
                        var schema = new _schema('system.roles').init(app);
                        var _v     = _.clone(role_value); // klonlamayınca alias'tan geçtiği için slug => s oluyor, get edilemiyor

                        role_value.ap = currId;
                        schema.post(role_value, function(err, role) {
                            guestRole(_v, currApp);

                            if( ! err && role ) {
                                schema = _v = null;
                                return cb(err, role);
                            }

                            schema.get({apps: currId, slug: _v.slug, qt: 'one'}, function(err, role) {
                                schema = _v = null;
                                cb(err, role);
                            });
                        });
                    };

                })(a, key, role_value, role_key, currId, currApp);
            });
        });

        var collect = function(models, obj, mainKey) {
            _.each(models, function(value, key) {
                if( ! value.schema ) {
                    return collect(value, obj, key);
                }

                key = mainKey ? mainKey+'.'+key : key;

                if(mainKey)
                    value.appName = mainKey;

                obj[key] = value;
            });

            return obj;
        };

        var models = {};
        models = collect(app.model, models);

        /**
         * save or get objects
         */

        _.each(models, function(value, key) {
            // inspector eklenmemiş veya appName'i olmayan modelleri resource kabul etmiyoruz
            if( ! value.schema.inspector || ! value.appName ) {
                console.log('inspector or app name not found: ', key);
                return;
            }

            var currApp = apps['app_'+value.appName];

            if( ! currApp ) {
                console.log('curr app not found: ', key);
                return;
            }

            // get app id
            var currId = currApp._id.toString();

            (function(a, value, key, currId) {
                a['object_'+key] = function(cb) {
                    var schema = new _schema('system.objects').init(app);
                    var plural = dot.get(value.schema, 'inspector.Options.plural');

                    schema.post({apps: currId, name: plural || key, slug: key}, function(err, object) {
                        if( ! err && object ) {
                            schema = plural = null;
                            return cb(err, object);
                        }

                        schema.get({apps: currId, slug: key, qt: 'one'}, function(err, object) {
                            schema = plural = null;
                            cb(err, object);
                        });
                    });
                };
            })(a, value, key, currId);
        });

        // execute parallel
        async.parallel(a, function(err, results) {
            // console.log(results);

            var series = {};

            /**
             * create superadmin user
             */

            series['superadmin'] = function(cb) {
                var currApp = apps['app_system'];

                if( ! currApp )
                    return;

                // get app id
                var currId = currApp._id.toString();

                _c.api.admin.user.ap = currId;
                _c.api.admin.user.ro = results['role_system.superadmin']._id.toString(); // get role id

                var schema = new _schema('system.users').init(app);
                schema.post(_c.api.admin.user, function(err, user) {
                    if( ! err && user ) {
                        // users modelinde superadmin role'üne izin vermediğimiz için burda ekliyoruz
                        app.acl.addUserRoles(user._id.toString(), 'superadmin');
                        return cb(err, user);
                    }

                    schema.get({apps: currId, email: _c.api.admin.user.email, qt: 'one'}, function(err, user) {
                        // users modelinde superadmin role'üne izin vermediğimiz için burda ekliyoruz
                        if(user)
                            app.acl.addUserRoles(user._id.toString(), 'superadmin');

                        cb(err, user);
                    });
                });
            };

            /**
             * create actions
             */

            series['actions'] = function(cb) {
                _.each(_c.roles, function(value, key) {
                    var currApp = apps['app_'+key];

                    if( ! currApp )
                        return;

                    // get app id
                    var currId = currApp._id.toString();

                    // roles
                    var actions = value.actions;

                    _.each(actions, function(act_value, act_key) {
                        var role = results['role_'+key+'.'+act_key]._id.toString();

                        _.each(act_value, function(action, object) {
                            object = results['object_'+object]._id.toString();

                            var obj = {
                                apps    : currId,
                                roles   : role,
                                objects : object,
                                action  : action
                            };

                            new _schema('system.actions').init(app).post(obj, function(err, action) {
                                // if(err)
                                //    _log.info(err);

                                if( ! err && action )
                                    _log.info('action created');
                            });
                        });
                    });
                });

                cb();
            };

            // exec series
            async.series(series, function(err, results) {
                _log.info('sync data executed');
            });

        });

    });

};
