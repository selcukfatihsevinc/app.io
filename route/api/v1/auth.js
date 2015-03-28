var async     = require('async');
var crypto    = require('crypto');
var jwt       = require('jwt-simple');
var Validator = require('validatorjs');
var dot       = require('dotty');

module.exports = function(app) {

    var _env    = app.get('env');
    var _schema = app.lib.schema;
    var _conf   = app.config[_env].api; // api config
    var _resp   = app.system.response.app;

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
            token   : token,
            expires : expires
        };
    };

    /**
     * Login
     */

    app.post('/api/login', app.middle.client, function(req, res, next) {
        res.apiResponse = true;

        var a = {
            app: function(cb) {
                new _schema('system.apps').init(req, res, next).getById(req.appId, function(err, doc) {
                    cb(err, doc);
                });
            },
            user: function(cb) {
                var obj = {
                    apps  : req.appId,
                    email : req.body.email,
                    qt    : 'one'
                };

                new _schema('system.users').init(req, res, next).get(obj, function(err, doc) {
                    cb(err, doc);
                });
            }
        };

        async.parallel(a, function(err, results) {
            a = null;
            var appData  = results.app;
            var userData = results.user;

            if( ! userData ) {
                return next( _resp.Unauthorized({
                    type   : 'InvalidCredentials',
                    errors : ['email not found']}
                ));
            }
            else if(userData.is_enabled == 'No') {
                next( _resp.Unauthorized({
                    type   : 'InvalidCredentials',
                    errors : ['not enabled user']
                }));
            }
            else if( userData.hash === _hash(req.body.password, userData.salt) ) {
                var userId = userData._id.toString();
                var token  = _genToken({_id: userId}, _conf.token.secret, _conf.token.expires);

                a = {
                    resources: function(cb) {
                        app.acl.userRoles(userId, function(err, roles) {
                            app.acl.whatResources(roles, function(err, resources) {
                                cb(err, resources);
                            });
                        });
                    }
                };

                if(dot.get(req.app.model, appData.slug+'.profiles')) {
                    a.profile = function(cb) {
                        new _schema(appData.slug+'.profiles').init(req, res, next).get({user: userId, qt: 'one'}, function(err, doc) {
                            cb(err, doc);
                        });
                    }
                }

                async.parallel(a, function(err, results) {
                    token.resources = results.resources || {};
                    token.profile   = {};

                    if(results.profile)
                        token.profile = results.profile;

                    _resp.OK(token, res);
                });
            }
            else {
                next( _resp.Unauthorized({
                    type   : 'InvalidCredentials',
                    errors : ['wrong password']
                }));
            }
        });
    });

};