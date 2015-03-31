var async     = require('async');
var crypto    = require('crypto');
var jwt       = require('jwt-simple');
var Validator = require('validatorjs');
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
     * Login
     */

    app.post('/api/login', _mdl.client, _mdl.appuser, _mdl.user.enabled, function(req, res, next) {
        res.apiResponse = true;

        if( req.userData.hash === _hash(req.body.password, req.userData.salt) ) {
            var userId = req.userData._id.toString();
            var token  = _genToken({_id: userId}, _conf.token.secret, _conf.token.expires);

            var a = {
                resources: function(cb) {
                    app.acl.userRoles(userId, function(err, roles) {
                        app.acl.whatResources(roles, function(err, resources) {
                            cb(err, resources);
                        });
                    });
                }
            };

            if(dot.get(req.app.model, req.appData.slug+'.profiles')) {
                a.profile = function(cb) {
                    new _schema(req.appData.slug+'.profiles').init(req, res, next).get({user: userId, qt: 'one'}, function(err, doc) {
                        cb(err, doc);
                    });
                }
            }

            async.parallel(a, function(err, results) {
                token.userId    = userId;
                token.resources = results.resources || {};
                token.profile   = false;

                if(results.profile)
                    token.profile = results.profile;

                _resp.OK(token, res);

                a = null;
            });
        }
        else {
            next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['wrong password']
            }));
        }
    });

    /**
     * Forgot Password
     */

    app.post('/api/forgot', _mdl.client, _mdl.appuser, _mdl.user.enabled, function(req, res, next) {
        res.apiResponse = true;

        // save token
        var obj = {
            reset_token: _random(24), // update token on every request
            reset_expires: Date.now()+3600000
        };

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

    app.get('/api/reset/:token', _mdl.token.reset, function(req, res, next) {
        res.apiResponse = true;
        _resp.OK({}, res);
    });

    app.post('/api/reset/:token', _mdl.token.reset, function(req, res, next) {
        res.apiResponse = true;
        var password    = req.body.password;
        var userId      = req.userData._id;

        var a = {
            setUser: function(cb) {
                new _schema('system.users').init(req, res, next).put(userId, {password: password}, function(err, affected) {
                    cb(err, affected);
                });
            },
            updateUser: function(cb) {
                new _schema('system.users').init(req, res, next).put(userId, {
                    reset_token: {"__op": "Delete"},
                    reset_expires: {"__op": "Delete"}
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

};