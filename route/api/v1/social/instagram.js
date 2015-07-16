var passport = require('passport');
var strategy = require('passport-instagram').Strategy;
var async    = require('async');
var dot      = require('dotty');
var _        = require('underscore');


module.exports = function(app) {

    var _env    = app.get('env');
    var _mdl    = app.middle;
    var _schema = app.lib.schema;
    var _conf   = app.config[_env].social;
    var emitter = app.lib.schemaEmitter;

    /**
     * init passport instagram
     */

    _.each(_conf, function(value, key) {
        var project = key;

        if( ! value.instagram)
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
                if(err)
                    done(err);

                new _schema('system.accounts').init(app).get({
                    apps: apps._id.toString(),
                    user_id: parseInt(profile.id),
                    qt: 'one'
                }, function(err, account) {

                    if(err)
                        return done(err);

                    if( ! req.session.social )
                        req.session.social = {};

                    if( ! account ) {
                        new _schema('system.accounts').init(app).post({
                            apps: apps._id.toString(),
                            type: 'I',
                            user_id: parseInt(profile.id),
                            user_id_str: profile.id,
                            user_name: profile.username,
                            display_name: profile.displayName,
                            profile_photo: dot.get(profile, '_json.data.profile_picture'),
                            token: accessToken,
                            refresh_token: refreshToken,
                        }, function(err, doc) {
                            if(err) {
                                console.log(err);
                                return done(err);
                            }

                            var obj = {
                                account_id: doc._id.toString(),
                                token: accessToken,
                                network_id: profile.id
                            }

                            req.session.social.instagram = obj;
                            emitter.emit('instagram_connected', obj);

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
                            var obj = {
                                account_id: account._id.toString(),
                                token: accessToken,
                                network_id: profile.id
                            }

                            req.session.social.instagram = obj;
                            emitter.emit('instagram_connected', obj);

                            done(err, {instagram: {}});
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