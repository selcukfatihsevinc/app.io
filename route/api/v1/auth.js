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
	var _emitter   = app.lib.schemaEmitter;
    var _transport = app.boot.mailer;
	var _mongoose  = app.core.mongo.mongoose;
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
        _mdl.user.waiting, // check waiting status first
        _mdl.user.enabled,
        _mdl.check.body.password,
    function(req, res, next) {
        var appData  = req.__appData;
        var userData = req.__userData;

        if( userData.hash !== _helper.hash(req.body.password, userData.salt) ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['wrong password']
            }));
        }

        app.libpost.auth.userData(userData, appData.slug, res);

        // push application 
        var Users = _mongoose.model('System_Users');
        Users.update({_id: userData._id}, {$addToSet: {ap: appData._id}}, {}, function(err, raw) {});
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
        var appData  = req.__appData;
        var userId   = req.__user.id;
        var resp     = {};

        app.libpost.auth.userProfile(userId, appData.slug, function(err, results) {
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
        _mdl.user.waiting, // check waiting status first
        _mdl.user.enabled,
    function(req, res, next) {
        var _group   = 'AUTH:FORGOT';
        var appData  = req.__appData;
        var userData = req.__userData;
        var userId   = req.__userData._id;
        var token    = _helper.random(24);

        // save token
        var obj = {
            reset_token   : token, // update token on every request
            reset_expires : Date.now()+3600000
        };

        // update user reset token
        new _schema('system.users').init(req, res, next).put(userId, obj, function(err, affected) {
            // send email
            app.libpost.auth.emailTemplate('reset', appData.slug, token, userData.email, _group, function() {});

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
        _mdl.appdata,
        _mdl.token.reset,
        _mdl.check.body.password,
    function(req, res, next) {
        var password = req.body.password;
        var userId   = req.__userData._id;
        var slug     = req.__appData.slug;

        // password rules
        var rules = {
            password: dot.get(_authConf, slug+'.register.password') || 'required|min:4|max:20',
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
                    reset_token   : {__op: 'Delete'},
                    reset_expires : {__op: 'Delete'}
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

    app.post('/api/invite',
        _mdl.json,
        _mdl.client,
        _mdl.appdata,
        _mdl.access, // needs app slug
        _mdl.authtoken,
        _mdl.auth,
        _mdl.check.body.email,
        _mdl.user.found,
    function(req, res, next) {
        var _group   = 'AUTH:INVITE';
        var appData  = req.__appData;
        var token    = _helper.random(24);
        var email    = req.body.email;
        var conf     = req.app.config[_env];
        var moderate = dot.get(conf.auth, appData.slug+'.auth.invite_moderation');
        var expires  = dot.get(conf.auth, appData.slug+'.auth.invite_expires') || 7;

        // save token
        var obj = {
            apps           : req.__appId,
            inviter        : req.__user.id,
            email          : email,
            invite_token   : token,
            invite_expires : _helper.daysLater(expires),
            detail         : req.body.detail
        };

        if(moderate) {
            obj.email_sent = 'N';
            obj.status     = 'WA';
        }

        var invites = new _schema('system.invites').init(req, res, next);

        invites.post(obj, function(err, doc) {
            if(err)
                return invites.errResponse(err);

            // send invitation mail
            // (eğer moderasyondan geçmeyecekse maili burada atıyoruz, moderasyondan geçecekse model hook'unda atıyoruz)
            if( ! moderate )
                app.libpost.auth.emailTemplate('invite', appData.slug, token, email, _group, function() {});

            _resp.Created({
                email: email
            }, res);
        });
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
        _mdl.default.role.invite,
    function(req, res, next) {
        var appData    = req.__appData;
        var inviteData = req.__inviteData;

        // set default password
        var password = req.body.password;
        if( ! password || password == '' )
            password = _helper.random(20);

        // validation rules
        var rules = {
            email    : 'required|email',
            password : dot.get(_authConf, appData.slug+'.register.password') || 'required|min:4|max:20'
        };

        var obj = {
            email      : inviteData.email,
            password   : password,
            roles      : req.__defaultRole,
            is_invited : 'Y',
            inviter    : inviteData.inviter
        };

        // check waiting list
        var waiting = dot.get(_authConf, appData.slug+'.auth.waiting_list');

        if(waiting) {
            obj.is_enabled     = 'N';
            obj.waiting_status = 'WA';
        }
        
        // validate data
        var validation = new Validator(obj, rules, _helper._slugs);

        if(validation.fails())
            return _helper.bodyErrors(validation.errors.all(), next);

        // save user with basic data
        var users = new _schema('system.users').init(req, res, next);

        users.post(obj, function(err, user) {
            if(err)
                return users.errResponse(err);

            new _schema('system.invites').init(req, res, next).put(inviteData._id, {
                invite_token   : {__op: 'Delete'},
                invite_expires : {__op: 'Delete'}
            },
            function(err, affected) {
                // send new user data
                _resp.Created({
                    email: user.email
                }, res);
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
            email    : 'required|email',
            password : dot.get(_authConf, slug+'.register.password') || 'required|min:4|max:20'
        };

        // check email verify option
        var no_email = dot.get(_authConf, slug+'.register.no_email_verify') || false;

        // user data
        var data = {
            email    : req.body.email,
            password : req.body.password,
            roles    : req.__defaultRole
        };

        // set user enable mode
        data.is_enabled = no_email ? 'Y' : 'N';
        
        // check waiting list
        var waiting = dot.get(_authConf, slug+'.auth.waiting_list') || false;

        if(waiting)
            data.waiting_status = 'WA';
        else
            data.register_token = token;
        
        // profile obj
        var profiles = slug+'.profiles';
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

	            // create profile and send response
                new _schema(profiles).init(req, res, next).post(profileObj, function(err, doc) {
	                _resp.Created({email: user.email}, res); // response
	                _emitter.emit('user_registered', {user: user}); // emit event
                });
            }
            else {
	            _resp.Created({email: user.email}, res); // response 
	            _emitter.emit('user_registered', {user: user}); // emit event
            }

            // send email (waiting listesinde ise veya email verify yapmıyorsak mail göndermiyoruz)
            if( ! waiting && ! no_email )
                app.libpost.auth.emailTemplate('register', slug, token, req.body.email, _group, function() {});
	        
	        // push application 
	        var Users = _mongoose.model('System_Users');
	        Users.update({_id: user._id}, {$addToSet: {ap: req.__appData._id}}, {}, function(err, raw) {});
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

    app.post('/api/resend',
        _mdl.json,
        _mdl.client,
        _mdl.appdata,
        _mdl.access, // needs app slug
        _mdl.check.body.email,
    function(req, res, next) {
        var _group = 'AUTH:RESEND';
        var slug   = req.__appData.slug;

        // check user by email
        new _schema('system.users').init(req, res, next).get({
            email: req.body.email.toLowerCase(), 
            qt: 'one'
        }, function(err, doc) {
            if( err || ! doc ) {
                return next( _resp.Unauthorized({
                    type: 'InvalidCredentials',
                    errors: ['user not found']}
                ));                
            }
            else if( ! doc.register_token ) {
                return next( _resp.Unauthorized({
                    type: 'InvalidCredentials',
                    errors: ['register token not found']}
                ));
            }
            
            // resend activation mail
            app.libpost.auth.emailTemplate('register', slug, doc.register_token, doc.email, _group, function() {
                _resp.OK({}, res);
            });
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
        var userData   = req.__userData;
        var slug       = req.__appData.slug;
        var oldPass    = req.body.old_password;
        var newPass    = req.body.new_password;
        var passRepeat = req.body.new_password_repeat;

        var data = {
            old_password        : oldPass,
            new_password        : newPass,
            new_password_repeat : passRepeat
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

        if( userData.hash !== _helper.hash(oldPass, userData.salt) ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['old_password is wrong']}
            ));
        }

        // update password
        new _schema('system.users').init(req, res, next).put(userData._id, {
            password: newPass,
            password_changed: 'Y',
            password_changed_at: Date.now()
        }, function(err, affected) {
            _resp.OK({affected: affected}, res);
        });
    });

    /**
     * ----------------------------------------------------------------
     * Social Login or Register
     * ----------------------------------------------------------------
     */

    app.post('/api/social',
        _mdl.json,
        _mdl.client,
        _mdl.appdata,
        _mdl.appuser, // don't throw error if user not found
        _mdl.access, // needs app slug
        _mdl.check.social,
        _mdl.check.username.exists,
        _mdl.default.role.register,
        // _mdl.user.waiting, profile data'sını token olmadan döneceğiz
        // _mdl.user.enabled, profile data'sını token olmadan döneceğiz
    function(req, res, next) {
        var appData    = req.__appData;
        var appSlug    = req.__appData.slug;
        var userData   = req.__userData;
        var socialData = req.__social;

        var tokenDisabled = false;
        if(userData && (userData.is_enabled == 'No' || userData.waiting_status != 'Accepted'))
            tokenDisabled = true;

        // return user data if found
        if(userData) {
            /**
             * @TODO
             * profili de kontrol et, eğer yoksa profil oluştur
             */
            
            return app.libpost.auth.userData(userData, appSlug, res, tokenDisabled);
        }

        // check username after login function
        if(req.__usernameExists) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['username exists']}
            ));
        }

        // validation rules
        var rules = {email: 'required|email'};

        // user data
        var data = {
            email    : req.body.email,
            password : _helper.random(20),
            roles    : req.__defaultRole
        };

        // check waiting list
        var waiting = dot.get(_authConf, appSlug+'.auth.waiting_list');
        
        if(waiting) {
            data.is_enabled     = 'N';
            data.waiting_status = 'WA'; 
        }
        
        // profile obj
        var profiles = appSlug+'.profiles';
        var mProfile = dot.get(req.app.model, profiles);

        if(mProfile) {
            rules.name = dot.get(_authConf, appSlug+'.register.name') || 'required';
            data.name  = req.body.name || socialData.name;
        }

        // set username
        var username = dot.get(_authConf, appSlug+'.register.username');

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

            // user id
            user._id = user._id.toString();
            
            // create profile
            if(mProfile) {
                var profileObj = {
                    apps  : req.__appId,
                    users : user._id,
                    name  : data.name
                };

                if(data.username)
                    profileObj.username = data.username;

                new _schema(profiles).init(req, res, next).post(profileObj, function(err, doc) {
                    // waiting list özelliği varsa token vs dönmüyoruz
                    if(waiting)
                        return app.libpost.auth.userData(user, appSlug, res, true); // tokenDisabled = true

                    // return user data
                    app.libpost.auth.userData(user, appSlug, res);
                });
            }
            else {
                // waiting list özelliği varsa token vs dönmüyoruz
                if(waiting)
                    return app.libpost.auth.userData(user, appSlug, res, true); // tokenDisabled = true

                // return user data
                app.libpost.auth.userData(user, appSlug, res);                
            }
        });
    });

    /**
     * ----------------------------------------------------------------
     * Waiting User List
     * ----------------------------------------------------------------
     */

    app.post('/api/waiting/accept',
        _mdl.json,
        _mdl.client,
        _mdl.appdata,
        _mdl.access, // needs app slug
        _mdl.authtoken,
        _mdl.auth,
        _mdl.data.body.userid,
        _mdl.user.acl('system.users', 'put*'),
    function(req, res, next) {
        var _group   = 'AUTH:WAITING:ACCEPT';
        var appSlug  = req.__appData.slug;
        var bodyUser = req.__bodyUser;
        
        // update user data
        new _schema('system.users').init(req, res, next).put(bodyUser._id, {
            is_enabled     : 'Y',
            waiting_status : 'AC'    
        },
        function(err, affected) {
            // send information mail
            app.libpost.auth.emailTemplate('waiting/accept', appSlug, null, bodyUser.email, _group, function() {});
            
            _resp.OK({affected: affected}, res);
        });
    });

    app.post('/api/waiting/decline',
        _mdl.json,
        _mdl.client,
        _mdl.appdata,
        _mdl.access, // needs app slug
        _mdl.authtoken,
        _mdl.auth,
        _mdl.data.body.userid,
        _mdl.user.acl('system.users', 'put*'),
    function(req, res, next) {
        var _group   = 'AUTH:WAITING:DECLINE';
        var appSlug  = req.__appData.slug;
        var bodyUser = req.__bodyUser;

        // update user data
        new _schema('system.users').init(req, res, next).put(bodyUser._id, {
            is_enabled     : 'N',
            waiting_status : 'DC'
        },
        function(err, affected) {
            // send information mail
            app.libpost.auth.emailTemplate('waiting/decline', appSlug, null, bodyUser.email, _group, function() {});

            _resp.OK({affected: affected}, res);
        });
    });

    app.get('/api/waiting/line',
        _mdl.json,
        _mdl.client,
        _mdl.appdata,
        _mdl.access, // needs app slug
        _mdl.data.query.email,
    function(req, res, next) {
        var _group   = 'AUTH:WAITING:LINE';
        var appSlug  = req.__appData.slug;
        var userData = req.__queryUser;
        
        if(userData.waiting_status == 'Accepted') {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['user is not in the waiting list']}
            ));
        }
        
        var a = {
            total: function(cb) {
                new _schema('system.users').init(req, res, next).get({
                    is_enabled: 'N',
                    waiting_status: 'WA',
                    qt: 'count'
                }, function(err, doc) {
                    cb(null, doc);
                });
            },
            before: function(cb) {
                new _schema('system.users').init(req, res, next).get({
                    _id: '{lt}'+userData._id,
                    is_enabled: 'N',
                    waiting_status: 'WA',
                    qt: 'count'
                }, function(err, doc) {
                    cb(null, doc);
                });
            }
        };
        
        async.parallel(a, function(err, results) {
            var total  = dot.get(results, 'total.count') || 0;
            var before = dot.get(results, 'before.count') || 0;
            var diff   = total-before;
            var after  = diff-1;
            
            _resp.OK({
                total  : total,
                before : before,
                after  : after,
                line   : total-after
            }, res);
        });
        
    });
    
};