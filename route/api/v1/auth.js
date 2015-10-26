var async     = require('async');
var crypto    = require('crypto');
var jwt       = require('jwt-simple');
var Validator = require('validatorjs');
var addrs     = require('email-addresses');
var dot       = require('dotty');
var _         = require('underscore');

module.exports = function(app) {

    var _env       = app.get('env');
    var _log       = app.lib.logger;
    var _schema    = app.lib.schema;
    var _mailer    = app.lib.mailer;
    var _helper    = app.lib.utils.helper;
    var _transport = app.boot.mailer;
    var _conf      = app.config[_env].api;
    var _appConf   = app.config[_env].app;
    var _authConf  = app.config[_env].auth;
    var _resp      = app.system.response.app;
    var _mdl       = app.middle;

    /**
     * ----------------------------------------------------------------
     * Login
     * ----------------------------------------------------------------
     */

    app.post('/api/login',
        _mdl.json,
        _mdl.client,
        _mdl.appdata,
        _mdl.appuser,
        _mdl.access, // needs app slug
        _mdl.user.enabled,
        _mdl.check.body.password,
    function(req, res, next) {
        var appData  = req.__appData;
        var userData = req.__userData;
        var userId   = req.__userData._id;

        if( userData.hash !== _helper.hash(req.body.password, userData.salt) ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['wrong password']
            }));
        }

        var a = {
            // get acl resources
            resources: function(cb) {
                app.acl.userRoles(userId, function(err, roles) {
                    app.acl.whatResources(roles, function(err, resources) {
                        cb(null, {roles: roles, resources: resources});
                    });
                });
            }
        };

        // generate profile if not exists
        if(dot.get(req.app.model, appData.slug+'.profiles')) {
            a.profile = function(cb) {
                new _schema(appData.slug+'.profiles').init(req, res, next).get({users: userId, qt: 'one'}, function(err, doc) {
                    cb(null, doc);
                });
            }
        }

        async.parallel(a, function(err, results) {
            var data  = {_id: userId};

            if(results.profile)
                data.profile = results.profile._id.toString();

            var token = _helper.genToken(data, _conf.token.secret, _conf.token.expires);

            token.userId    = userId;
            token.roles     = results.resources.roles || {};
            token.resources = results.resources.resources || {};
            token.profile   = false;

            if(results.profile)
                token.profile = results.profile;

            if(userData.last_login)
                token.lastLogin = userData.last_login;

            _resp.OK(token, res);

            // update last login
            new _schema('system.users').init(req, res, next).put(userId, {last_login: Date.now()}, function(err, affected) {});
        });
    });

    /**
     * ----------------------------------------------------------------
     * Token (send user data for verified token)
     * ----------------------------------------------------------------
     */

    app.get('/api/token',
        _mdl.json,
        _mdl.client,
        _mdl.appdata,
        _mdl.access, // needs app slug
        _mdl.authtoken,
        _mdl.auth,
    function(req, res, next) {
        var appData = req.__appData;
        var userId  = req.__user.id;
        var resp    = {};

        var a = {
            // get acl resources
            resources: function(cb) {
                app.acl.userRoles(userId, function(err, roles) {
                    app.acl.whatResources(roles, function(err, resources) {
                        cb(null, {roles: roles, resources: resources});
                    });
                });
            }
        };

        // get user profile
        if(dot.get(req.app.model, appData.slug+'.profiles')) {
            a.profile = function(cb) {
                new _schema(appData.slug+'.profiles').init(req, res, next).get({users: userId, qt: 'one'}, function(err, doc) {
                    cb(null, doc);
                });
            }
        }

        async.parallel(a, function(err, results) {
            resp.userId    = userId;
            resp.roles     = results.resources.roles || {};
            resp.resources = results.resources.resources || {};
            resp.profile   = false;

            if(results.profile)
                resp.profile = results.profile;

            _resp.OK(resp, res);
        });
    });

    /**
     * ----------------------------------------------------------------
     * Forgot Password
     * ----------------------------------------------------------------
     */

    app.post('/api/forgot',
        _mdl.json,
        _mdl.client,
        _mdl.appdata,
        _mdl.appuser,
        _mdl.access, // needs app slug
        _mdl.user.enabled,
    function(req, res, next) {
        var _group   = 'AUTH:FORGOT';
        var appData  = req.__appData;
        var userData = req.__userData;
        var userId   = req.__userData._id;

        // save token
        var obj = {
            reset_token: _helper.random(24), // update token on every request
            reset_expires: Date.now()+3600000
        };

        // update user reset token
        new _schema('system.users').init(req, res, next).put(userId, obj, function(err, affected) {
            var mailConf = dot.get(req.app.config[_env], 'app.mail.'+appData.slug);

            if(mailConf) {
                var mailObj = _.clone(mailConf.reset);

                req.app.render('email/templates/reset', {
                    baseUrl: mailConf.baseUrl,
                    endpoint: mailConf.endpoints.reset,
                    token: obj.reset_token
                }, function(err, html) {
                    if(err)
                        _log.error(_group, err);

                    if(html) {
                        mailObj.to   = userData.email;
                        mailObj.html = html;

                        _log.info(_group+':MAIL_OBJ', mailObj);

                        new _mailer(_transport).send(mailObj);
                    }
                });
            }
            else
                _log.info(_group+':MAIL_OBJ', 'not found');

            _resp.Created({
                email: userData.email
            }, res);
        });
    });

    app.get('/api/reset/:token',
        _mdl.json,
        _mdl.token.reset,
    function(req, res, next) {
        _resp.OK({}, res);
    });

    app.post('/api/reset/:token',
        _mdl.json,
        _mdl.client,
        _mdl.token.reset,
        _mdl.check.body.password,
    function(req, res, next) {
        var password = req.body.password;
        var userData = req.__userData;
        var userId   = req.__userData._id;

        /**
         * @TODO
         * kuralları config'e al
         */

        var rules = {
            password: 'required|min:4|max:32',
        };

        var validation = new Validator(req.body, rules);

        if(validation.fails()) {
            return next( _resp.UnprocessableEntity({
                type: 'ValidationError',
                errors: validation.errors.all()
            }));
        }

        var a = {
            setUser: function(cb) {
                new _schema('system.users').init(req, res, next).put(userId, {password: password}, function(err, affected) {
                    cb(err, affected);
                });
            },
            updateUser: function(cb) {
                new _schema('system.users').init(req, res, next).put(userId, {
                    reset_token: {__op: 'Delete'},
                    reset_expires: {__op: 'Delete'}
                },
                function(err, affected) {
                    cb(err, affected);
                });
            }
        };

        async.parallel(a, function(err, results) {
            _resp.OK({affected: results.setUser}, res);
        });
    });

    /**
     * ----------------------------------------------------------------
     * User Invitation
     * ----------------------------------------------------------------
     */

    var _invite_mail = function(config, appSlug, req, token) {
        var _group   = 'AUTH:INVITE';
        var mailConf = dot.get(config, 'app.mail.'+appSlug);

        if(mailConf) {
            var mailObj = _.clone(mailConf.invite);

            req.app.render('email/templates/invite', {
                baseUrl: mailConf.baseUrl,
                endpoint: mailConf.endpoints.invite,
                token: token
            }, function(err, html) {
                if(err)
                    _log.error(_group, err);

                if(html) {
                    mailObj.to   = req.body.email;
                    mailObj.html = html;

                    _log.info(_group+':MAIL_OBJ', mailObj);

                    new _mailer(_transport).send(mailObj);
                }
            });
        }
        else
            _log.info(_group+':MAIL_OBJ', 'not found');
    }

    app.post('/api/invite',
        _mdl.json,
        _mdl.client,
        _mdl.appdata,
        _mdl.access, // needs app slug
        _mdl.authtoken,
        _mdl.auth,
        _mdl.authtoken,
        _mdl.check.body.email,
        _mdl.user.found,
    function(req, res, next) {
        /**
         * @TODO
         * expire süresini config'e bağla
         */
        var appData  = req.__appData;
        var conf     = req.app.config[_env];
        var token    = _helper.random(24);
        var moderate = dot.get(conf, 'app.config.'+appData.slug+'.auth.invite_moderation');

        // save token
        var obj = {
            apps: req.__appId,
            inviter: req.__user.id,
            email: req.body.email,
            invite_token: token,
            invite_expires: Date.now()+(3600000*24*30), // 30 gün expire süresi
            detail: req.body.detail
        };

        if(moderate) {
            obj.email_sent = 'N';
            obj.status = 'WA';
        }

        var invites = new _schema('system.invites').init(req, res, next);

        invites.post(obj, function(err, doc) {
            if(err)
                return invites.errResponse(err);

            // send invitation mail
            // (eğer moderasyondan geçmeyecekse maili burada atıyoruz, moderasyondan geçecekse model hook'unda atıyoruz)
            if( ! moderate )
               _invite_mail(conf, appData.slug, req, token);

            _resp.Created({
                email: req.body.email
            }, res);
        });
    });

    /**
     * @TODO
     * invite status işlemlerini burada yap, acl ile system.invites üzerinde put* iznine bak
     */

    app.post('/api/invite_accept/:id', function(req, res, next) {

    });

    app.post('/api/invite_decline/:id', function(req, res, next) {

    });

    app.get('/api/invite/:token',
        _mdl.json,
        _mdl.token.invite,
    function(req, res, next) {
        _resp.OK({}, res);
    });

    app.post('/api/invite/:token',
        _mdl.json,
        _mdl.client,
        _mdl.appdata,
        _mdl.access, // needs app slug
        _mdl.token.invite,
    function(req, res, next) {
        var appData    = req.__appData;
        var inviteData = req.__inviteData;

        // set default password
        var password = req.body.password;
        if( ! password || password == '' )
            password = _helper.random(24);

        // get initial role for app
        var slug = dot.get(app.config[_env], 'roles.'+appData.slug+'.initial.invite');

        if( ! slug ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['initial role config not found (invite)']
            }));
        }

        // get role by slug
        new _schema('system.roles').init(req, res, next).get({
            apps: appData._id,
            slug: slug,
            qt: 'one'
        }, function(err, doc) {
            if( err || ! doc ) {
                return next( _resp.Unauthorized({
                    type: 'InvalidCredentials',
                    errors: ['initial role not found (invite)']
                }));
            }

            /**
             * @TODO
             * password kurallarını uygulama kurallarından almalı
             */

            var obj = {
                email: inviteData.email,
                password: password,
                roles: doc._id.toString(),
                is_invited: 'Y',
                inviter: inviteData.inviter
            };

            // save user with basic data
            var users = new _schema('system.users').init(req, res, next);

            users.post(obj, function(err, user) {
                if(err)
                    return users.errResponse(err);

                new _schema('system.invites').init(req, res, next).put(inviteData._id, {
                    invite_token: {__op: 'Delete'},
                    invite_expires: {__op: 'Delete'}
                },
                function(err, affected) {
                    // send new user data
                    _resp.Created({
                        email: user.email
                    }, res);
                });
            });
        });
    });

    /**
     * ----------------------------------------------------------------
     * Register
     * ----------------------------------------------------------------
     */

    app.post('/api/register',
        _mdl.json,
        _mdl.client,
        _mdl.appdata,
        _mdl.access,
        _mdl.check.email.domains,
        _mdl.check.username.exists,
        _mdl.default.role.register,
    function(req, res, next) {
        var _group = 'AUTH:REGISTER';
        var slug   = req.__appData.slug;
        var token  = _helper.random(24);

        // validation rules
        var rules = {
            email: 'required|email',
            password: dot.get(_authConf, slug+'.register.password') || 'required|min:4|max:20'
        };

        // user data
        var data = {
            email: req.body.email,
            password: req.body.password,
            roles: req.__defaultRole,
            is_enabled: 'N',
            register_token: token,
        };

        // profile obj
        var profiles = req.__appData.slug+'.profiles';
        var mProfile = dot.get(req.app.model, profiles);

        if(mProfile) {
            rules.name = dot.get(_authConf, slug+'.register.name') || 'required';
            data.name  = req.body.name;
        }

        // set username
        var username = dot.get(_authConf, slug+'.register.username');

        if(username) {
            rules.username = username;
            data.username  = req.body.username;
        }

        // validate data
        var validation = new Validator(data, rules, _helper._slugs);

        if(validation.fails())
            return _helper.bodyErrors(validation.errors.all(), next);

        // save user
        var users = new _schema('system.users').init(req, res, next);

        users.post(data, function(err, user) {
            if(err)
                return users.errResponse(err);

            // create profile
            if(mProfile) {
                var profileObj = {
                    apps  : req.__appId,
                    users : user._id.toString(),
                    name  : req.body.name
                };

                if(data.username)
                    profileObj.username = data.username;

                new _schema(profiles).init(req, res, next).post(profileObj, function(err, doc) {});
            }

            // send activation mail
            var _mailConf = dot.get(req.app.config[_env], 'app.mail.'+slug);

            if(_mailConf) {
                var mailObj = _.clone(_mailConf.register);

                req.app.render(slug+'/email/templates/register', {
                    baseUrl: _mailConf.baseUrl,
                    endpoint: _mailConf.endpoints.verify,
                    token: token
                }, function(err, html) {
                    if(err)
                        _log.error(_group, err);

                    if(html) {
                        mailObj.to   = req.body.email;
                        mailObj.html = html;

                        _log.info(_group+':MAIL_OBJ', mailObj);

                        new _mailer(_transport).send(mailObj);
                    }
                });
            }
            else
                _log.info(_group+':MAIL_OBJ', 'not found');

            // response
            _resp.Created({
                email: user.email
            }, res);
        });
    });

    app.get('/api/verify/:token',
        _mdl.json,
        _mdl.token.verify,
    function(req, res, next) {
        _resp.OK({}, res);
    });

    app.post('/api/verify/:token',
        _mdl.json,
        _mdl.client,
        _mdl.token.verify,
    function(req, res, next) {
        var userId = req.__userData._id;

        var a = {
            setUser: function(cb) {
                new _schema('system.users').init(req, res, next).put(userId, {is_enabled: 'Y'}, function(err, affected) {
                    cb(err, affected);
                });
            },
            updateUser: function(cb) {
                new _schema('system.users').init(req, res, next).put(userId, {
                    register_token: {__op: 'Delete'}
                },
                function(err, affected) {
                    cb(err, affected);
                });
            }
        };

        async.parallel(a, function(err, results) {
            _resp.OK({affected: results.setUser}, res);
        });
    });

    /**
     * ----------------------------------------------------------------
     * Change Password
     * ----------------------------------------------------------------
     */

    app.post('/api/change_password',
        _mdl.json,
        _mdl.client,
        _mdl.appdata,
        _mdl.access, // needs app slug
        _mdl.authtoken,
        _mdl.auth,
        _mdl.user.data,
    function(req, res, next) {
        var userData = req.__userData;
        var slug     = req.__appData.slug;

        var data = {
            old_password        : req.body.old_password,
            new_password        : req.body.new_password,
            new_password_repeat : req.body.new_password_repeat
        }

        var rule  = dot.get(_authConf, slug+'.register.password') || 'required|min:4|max:20';
        var rules = {
            old_password        : 'required',
            new_password        : rule,
            new_password_repeat : rule+'|same:new_password',
        };

        var validation = new Validator(data, rules);

        if(validation.fails()) {
            return next( _resp.UnprocessableEntity({
                type: 'ValidationError',
                errors: validation.errors.all()
            }));
        }

        if( userData.hash !== _helper.hash(req.body.old_password, userData.salt) ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['old_password is wrong']}
            ));
        }

        // update password
        new _schema('system.users').init(req, res, next).put(userData._id, {password: req.body.new_password}, function(err, affected) {
            _resp.OK({affected: affected}, res);
        });
    });

};