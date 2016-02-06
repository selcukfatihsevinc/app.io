var passport = require('passport');
var strategy = require('passport-facebook').Strategy;
var async    = require('async');
var _        = require('underscore');

module.exports = function(app) {

    var _env     = app.get('env');
    var _mdl     = app.middle;
    var _schema  = app.lib.schema;
    var _conf    = app.config[_env].social;
    var _emitter = app.lib.schemaEmitter;
    var _group   = 'AUTH:SOCIAL:FACEBOOK';
    
    /**
     * init passport facebook
     */

    _.each(_conf, function(value, key) {
        var project = key;

        if( ! value.facebook || ! value.facebook.enable )
            return;

        var facebook = value.facebook;

        passport.use(new strategy({
            clientID: facebook.key,
            clientSecret: facebook.secret,
            callbackURL: facebook.callback,
            passReqToCallback : true
        },
        function(req, accessToken, refreshToken, profile, done) {
            var project = req.params.project;

            new _schema('system.apps').init(app).get({
                slug: project,
                qt: 'one'
            }, function(err, apps) {
                if(err) {
                    _log.info(_group, 'app not found');
                    return done(null);
                }

                new _schema('system.accounts').init(app).get({
                    apps: apps._id.toString(),
                    user_id: parseInt(profile.id),
                    qt: 'one'
                }, function(err, account) {

                    if(err) {
                        if(err.name != 'NotFound')
                            return done(null);
                    }

                    if( ! req.session.social )
                        req.session.social = {};

                    var profilePhoto = 'http://graph.facebook.com/'+profile.id+'/picture?type=square';
                    var sessionObj   = {
                        network_id: parseInt(profile.id),
                        network_id_str: profile.id,
                        user_name: profile.username || '',
                        display_name: profile.displayName || '',
                        profile_photo: profilePhoto,
                        token: accessToken,
                        refresh_token: refreshToken || ''
                    };
                    
                    if( ! account ) {
                        new _schema('system.accounts').init(app).post({
                            apps: apps._id.toString(),
                            type: 'F',
                            user_id: parseInt(profile.id),
                            user_id_str: profile.id,
                            user_name: profile.username || '',
                            display_name: profile.displayName || '',
                            profile_photo: 'http://graph.facebook.com/'+profile.id+'/picture?type=square',
                            token: accessToken,
                            refresh_token: refreshToken || '',
                        }, function(err, doc) {
                            if(err) {
                                console.log(err);
                                return done(null);
                            }

                            sessionObj.account_id = doc._id.toString();
                            req.session.social.facebook = sessionObj;
                            _emitter.emit('facebook_connected', sessionObj);

                            done(null, {facebook: {}});
                        });
                    }
                    else {
                        new _schema('system.accounts').init(app).put(account._id.toString(), {
                            user_name: profile.username || '',
                            display_name: profile.displayName || '',
                            profile_photo: 'http://graph.facebook.com/'+profile.id+'/picture?type=square',
                            token: accessToken
                        }, function(err, affected) {
                            sessionObj.account_id = account._id.toString();
                            req.session.social.facebook = sessionObj;
                            _emitter.emit('facebook_connected', sessionObj);

                            done(null, {facebook: {}});
                        });
                    }
                });
            });
        }));

        app.get('/api/:project/auth/facebook', passport.authenticate('facebook'));

        app.get('/api/:project/facebook/callback', passport.authenticate('facebook', {
            successRedirect: facebook.success,
            failureRedirect: facebook.failure
        }));

    });

};