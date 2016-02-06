var passport = require('passport');
var strategy = require('passport-instagram').Strategy;
var async    = require('async');
var dot      = require('dotty');
var _        = require('underscore');


module.exports = function(app) {

    var _env     = app.get('env');
    var _mdl     = app.middle;
    var _schema  = app.lib.schema;
    var _conf    = app.config[_env].social;
    var _emitter = app.lib.schemaEmitter;
    var _group   = 'AUTH:SOCIAL:INSTAGRAM';
    
    /**
     * init passport instagram
     */

    _.each(_conf, function(value, key) {
        var project = key;

        if( ! value.instagram || ! value.instagram.enable )
            return;

        var instagram = value.instagram;

        passport.use(new strategy({
            clientID: instagram.key,
            clientSecret: instagram.secret,
            callbackURL: instagram.callback,
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

                    var profilePhoto = dot.get(profile, '_json.data.profile_picture') || '';
                    var sessionObj   = {
                        network_id: parseInt(profile.id),
                        network_id_str: profile.id,
                        user_name: profile.username || '',
                        display_name: profile.displayName || '',
                        profile_photo: profilePhoto,
                        token: accessToken,
                        refresh_token: refreshToken
                    };
                    
                    if( ! account ) {
                        new _schema('system.accounts').init(app).post({
                            apps: apps._id.toString(),
                            type: 'I',
                            user_id: parseInt(profile.id),
                            user_id_str: profile.id,
                            user_name: profile.username,
                            display_name: profile.displayName,
                            profile_photo: profilePhoto,
                            token: accessToken,
                            refresh_token: refreshToken,
                        }, function(err, doc) {
                            if(err) {
                                console.log(err);
                                return done(null);
                            }

                            sessionObj.account_id = doc._id.toString();
                            req.session.social.instagram = sessionObj;
                            _emitter.emit('instagram_connected', sessionObj);

                            done(null, {instagram: {}});
                        });
                    }
                    else {
                        new _schema('system.accounts').init(app).put(account._id.toString(), {
                            user_name: profile.username,
                            display_name: profile.displayName,
                            profile_photo: dot.get(profile, '_json.data.profile_picture'),
                            token: accessToken
                        }, function(err, affected) {
                            sessionObj.account_id = account._id.toString();
                            req.session.social.instagram = sessionObj;
                            _emitter.emit('instagram_connected', sessionObj);

                            done(null, {instagram: {}});
                        });
                    }
                });
            });
        }));

        app.get('/api/:project/auth/instagram', passport.authenticate('instagram'));

        app.get('/api/:project/instagram/callback', passport.authenticate('instagram', {
            successRedirect: instagram.success,
            failureRedirect: instagram.failure
        }));

    });

};