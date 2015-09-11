var async     = require('async');
var crypto    = require('crypto');
var jwt       = require('jwt-simple');
var Validator = require('validatorjs');
var addrs     = require('email-addresses');
var dot       = require('dotty');

module.exports = function(app) {

    var _env       = app.get('env');
    var _schema    = app.lib.schema;
    var _mailer    = app.lib.mailer;
    var _transport = app.boot.mailer;
    var _conf      = app.config[_env].api; // api config
    var _appconf   = app.config[_env].app; // app config
    var _resp      = app.system.response.app;
    var _mdl       = app.middle;

    var _hash = function(passwd, salt) {
        return crypto.createHmac('sha256', salt).update(passwd).digest('hex');
    };

    var _expiresIn = function(numDays) {
        var date = new Date();
        return date.setDate(date.getDate()+numDays);
    };

    var _genToken = function(user, secret, days) {
        var expires = _expiresIn(days);
        var token   = jwt.encode({exp: expires, user: user}, secret);

        return {
            token: token,
            expires: expires
        };
    };

    var _random = function(len) {
        return crypto.randomBytes(Math.ceil(len/2))
            .toString('hex') // convert to hexadecimal format
            .slice(0,len);   // return required number of characters
    };

    /**
     * ----------------------------------------------------------------
     * Login
     * ----------------------------------------------------------------
     */

    app.post('/api/login',
        _mdl.client,
        _mdl.appuser,
        _mdl.user.enabled,
        _mdl.access,
        _mdl.json,
        _mdl.check.body.password,
    function(req, res, next) {
        if( req.userData.hash !== _hash(req.body.password, req.userData.salt) ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['wrong password']
            }));
        }

        var userId = req.userData._id.toString();
        var token  = _genToken({_id: userId}, _conf.token.secret, _conf.token.expires);

        var a = {
            // get acl resources
            resources: function(cb) {
                app.acl.userRoles(userId, function(err, roles) {
                    app.acl.whatResources(roles, function(err, resources) {
                        cb(err, {roles: roles, resources: resources});
                    });
                });
            }
        };

        // generate profile if not exists
        if(dot.get(req.app.model, req.appData.slug+'.profiles')) {
            a.profile = function(cb) {
                new _schema(req.appData.slug+'.profiles').init(req, res, next).post({users: userId}, function(err, doc) {
                    new _schema(req.appData.slug+'.profiles').init(req, res, next).get({users: userId, qt: 'one'}, function(err, doc) {
                        cb(err, doc);
                    });
                });
            }
        }

        async.parallel(a, function(err, results) {
            token.userId    = userId;
            token.name      = req.userData.name;
            token.roles     = results.resources.roles || {};
            token.resources = results.resources.resources || {};
            token.profile   = false;

            if(results.profile)
                token.profile = results.profile;

            if(req.userData.last_login)
                token.lastLogin = req.userData.last_login;

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
        _mdl.client,
        _mdl.appdata,
        _mdl.authtoken,
        _mdl.auth,
        _mdl.access,
        _mdl.json,
    function(req, res, next) {
        var userId = req.user.id;
        var resp   = {};

        var a = {
            // get acl resources
            resources: function(cb) {
                app.acl.userRoles(userId, function(err, roles) {
                    app.acl.whatResources(roles, function(err, resources) {
                        cb(err, {roles: roles, resources: resources});
                    });
                });
            }
        };

        // get user profile
        if(dot.get(req.app.model, req.appData.slug+'.profiles')) {
            a.profile = function(cb) {
                new _schema(req.appData.slug+'.profiles').init(req, res, next).get({users: userId, qt: 'one'}, function(err, doc) {
                    cb(err, doc);
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
        _mdl.client,
        _mdl.appuser,
        _mdl.user.enabled,
        _mdl.access,
        _mdl.json,
    function(req, res, next) {
        // save token
        var obj = {
            reset_token: _random(24), // update token on every request
            reset_expires: Date.now()+3600000
        };

        // update user reset token
        new _schema('system.users').init(req, res, next).put(req.userData._id, obj, function(err, affected) {
            var mailconf = dot.get(req.app.config[_env], 'app.mail.'+req.appData.slug);

            if(mailconf) {
                var mailObj = mailconf.reset;

                req.app.render('email/templates/reset', {
                    baseUrl: mailconf.baseUrl,
                    endpoint: mailconf.endpoints.reset,
                    token: obj.reset_token
                }, function(err, html) {
                    if(html) {
                        mailObj.to = req.userData.email;
                        mailObj.html = html;

                        new _mailer(_transport).send(mailObj);
                    }
                });
            }

            _resp.Created({
                email: req.userData.email
            }, res);
        });
    });

    app.get('/api/reset/:token',
        _mdl.token.reset,
        _mdl.json,
    function(req, res, next) {
        _resp.OK({}, res);
    });

    app.post('/api/reset/:token',
        _mdl.client,
        _mdl.token.reset,
        _mdl.json,
    function(req, res, next) {
        var password = req.body.password;
        var userId   = req.userData._id;

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
        var mailconf = dot.get(config, 'app.mail.'+appSlug);

        if(mailconf) {
            var mailObj = mailconf.invite;

            req.app.render('email/templates/invite', {
                baseUrl: mailconf.baseUrl,
                endpoint: mailconf.endpoints.invite,
                token: token
            }, function(err, html) {
                if(html) {
                    mailObj.to = req.body.email;
                    mailObj.html = html;

                    new _mailer(_transport).send(mailObj);
                }
            });
        }
    }

    app.post('/api/invite',
        _mdl.authtoken,
        _mdl.auth,
        _mdl.client,
        _mdl.appdata,
        _mdl.user.found,
        _mdl.access,
        _mdl.json,
    function(req, res, next) {
        /**
         * @TODO
         * expire süresini config'e bağla
         */

        var conf     = req.app.config[_env];
        var token    = _random(24);
        var moderate = dot.get(conf, 'app.config.'+req.appData.slug+'.auth.invite_moderation');

        // save token
        var obj = {
            apps: req.appId,
            inviter: req.user.id,
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
            if( ! moderate )
               _invite_mail(conf, req.appData.slug, req, token);

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
        _mdl.token.invite,
        _mdl.json,
    function(req, res, next) {
        _resp.OK({}, res);
    });

    app.post('/api/invite/:token',
        _mdl.client,
        _mdl.appdata,
        _mdl.token.invite,
        _mdl.access,
        _mdl.json,
    function(req, res, next) {
        // get initial role for app
        var slug = dot.get(app.config[_env], 'roles.'+req.appData.slug+'.initial.invite');

        // get role by slug
        new _schema('system.roles').init(req, res, next).get({slug: slug, qt: 'one'}, function(err, doc) {
            if(err || ! doc) {
                return next( _resp.Unauthorized({
                    type: 'InvalidCredentials',
                    errors: ['initial role not found']
                }));
            }

            var obj = {
                apps: req.appId,
                name: req.inviteData.name || req.body.name,
                email: req.inviteData.email,
                password: req.body.password,
                roles: doc._id.toString(),
                is_invited: 'Y',
                inviter: req.inviteData.inviter
            };

            // save user with basic data
            var users = new _schema('system.users').init(req, res, next);

            users.post(obj, function(err, user) {
                if(err)
                    return users.errResponse(err);

                // create user profile
                if(dot.get(req.app.model, req.appData.slug+'.profiles')) {
                    new _schema(req.appData.slug+'.profiles').init(req, res, next).post({users: user._id.toString()}, function(err, doc) {});
                }

                new _schema('system.invites').init(req, res, next).put(req.inviteData._id, {
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
        _mdl.client,
        _mdl.appdata,
        _mdl.access,
        _mdl.json,
    function(req, res, next) {
        var appslug  = req.appData.slug;
        var mailconf = dot.get(req.app.config[_env], 'app.mail.'+appslug);

        if(Object.prototype.toString.call(mailconf.domains) == '[object Array]' && mailconf.domains.length) {
            var email = addrs.parseOneAddress(req.body.email);

            if( ! email ) {
                return next( _resp.Unauthorized({
                    type: 'InvalidCredentials',
                    errors: ['not found email']
                }));
            }

            if(mailconf.domains.indexOf(email.domain) == -1) {
                return next( _resp.Unauthorized({
                    type: 'InvalidCredentials',
                    errors: ['not allowed domain']
                }));
            }
        }

        var token = _random(24);
        var obj   = {
            apps: req.appId,
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            is_enabled: 'N',
            register_token: token
        };

        var users = new _schema('system.users').init(req, res, next);

        users.post(obj, function(err, user) {
            if(err)
                return users.errResponse(err);

            // create user profile
            if(dot.get(req.app.model, req.appData.slug+'.profiles')) {
                new _schema(req.appData.slug+'.profiles').init(req, res, next).post({users: user._id.toString()}, function(err, doc) {});
            }

            if(mailconf) {
                var mailObj = mailconf.register;

                req.app.render(appslug+'/email/templates/register', {
                    baseUrl: mailconf.baseUrl,
                    endpoint: mailconf.endpoints.verify,
                    token: token
                }, function(err, html) {
                    if(html) {
                        mailObj.to = req.body.email;
                        mailObj.html = html;

                        new _mailer(_transport).send(mailObj);
                    }
                });
            }

            _resp.Created({
                email: user.email
            }, res);
        });
    });

    app.get('/api/verify/:token',
        _mdl.token.verify,
        _mdl.json,
    function(req, res, next) {
        _resp.OK({}, res);
    });

    app.post('/api/verify/:token',
        _mdl.client,
        _mdl.token.verify,
        _mdl.json,
    function(req, res, next) {
        var userId = req.userData._id;

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
        _mdl.authtoken,
        _mdl.auth,
        _mdl.user.data,
        _mdl.json,
    function(req, res, next) {
        var data = {
            old_password        : req.body.old_password,
            new_password        : req.body.new_password,
            new_password_repeat : req.body.new_password_repeat
        }

        /**
         * @TODO
         * kuralları config'e çek
         */

        var rules = {
            old_password        : 'required',
            new_password        : 'required|min:4|max:32',
            new_password_repeat : 'required|min:4|max:32|same:new_password',
        };

        var validation = new Validator(data, rules);

        if(validation.fails()) {
            return next( _resp.UnprocessableEntity({
                type: 'ValidationError',
                errors: validation.errors.all()
            }));
        }

        if( req.userData.hash !== _hash(req.body.old_password, req.userData.salt) ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['old_password is wrong']}
            ));
        }

        // update password
        new _schema('system.users').init(req, res, next).put(req.userData._id, {password: req.body.new_password}, function(err, affected) {
            _resp.OK({affected: affected}, res);
        });
    });

};