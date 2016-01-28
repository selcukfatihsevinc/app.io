var passport = require('passport');
var strategy = require('passport-foursquare').Strategy;
var async    = require('async');
var dot      = require('dotty');
var _        = require('underscore');

module.exports = function(app) {

    var _env     = app.get('env');
    var _mdl     = app.middle;
    var _log     = app.lib.logger;
    var _schema  = app.lib.schema;
    var _conf    = app.config[_env].social;
    var _emitter = app.lib.schemaEmitter;
    var _group   = 'AUTH:SOCIAL:FOURSQUARE';

    /**
     * init passport foursquare
     */

    _.each(_conf, function(value, key) {
        var project = key;

        if( ! value.foursquare || ! value.foursquare.enable )
            return;

        var foursquare = value.foursquare;

        passport.use(new strategy({
            clientID: foursquare.key,
            clientSecret: foursquare.secret,
            callbackURL: foursquare.callback,
            passReqToCallback : true
        },
        function(req, token, tokenSecret, profile, done) {
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

                    /*
                    console.log(profile._json.response);

                    {
                        user: {
                            id: '80450341',
                                firstName: 'Selçuk',
                                lastName: 'Sevinç',
                                gender: 'male',
                                relationship: 'self',
                                canonicalUrl: 'https://foursquare.com/user/80450341',
                                photo: {
                                prefix: 'https://irs0.4sqi.net/img/user/',
                                    suffix: '/80450341-SVJ2VUOWXEHQWH4T.jpg'
                            },
                            friends: {
                                count: 66,
                                    groups: [Object]
                            },
                            birthday: 277689600,
                                tips: {
                                count: 0
                            },
                            homeCity: 'Istanbul, Istanbul',
                                bio: '',
                                contact: {
                                verifiedPhone: 'false',
                                    email: 'airsfs@hotmail.com',
                                    facebook: '585453281'
                            },
                            photos: {
                                count: 0,
                                    items: []
                            },
                            checkinPings: 'off',
                                pings: false,
                                type: 'user',
                                mayorships: {
                                count: 0,
                                    items: []
                            },
                            checkins: {
                                count: 141,
                                    items: [Object]
                            },
                            requests: {
                                count: 0
                            },
                            lists: {
                                count: 2,
                                    groups: [Object]
                            },
                            blockedStatus: 'none',
                                createdAt: 1393837394,
                                referralId: 'u-80450341'
                        }
                    }                  
                    return;
                    */
                    
                    if( ! req.session.social )
                        req.session.social = {};

                    if( ! account ) {
                        new _schema('system.accounts').init(app).post({
                            apps: apps._id.toString(),
                            type: 'T',
                            user_id: parseInt(profile.id),
                            user_id_str: profile.id,
                            user_name: profile.username || '',
                            display_name: profile.displayName || '',
                            profile_photo: dot.get(profile, '_json.profile_image_url') || '',
                            token: token,
                            token_secret: tokenSecret,
                        }, function(err, doc) {
                            if(err) {
                                console.log(err);
                                return done(err);
                            }

                            var obj = {
                                account_id: doc._id.toString(),
                                token: token,
                                token_secret: tokenSecret,
                                network_id: profile.id
                            }

                            req.session.social.twitter = obj;
                            _emitter.emit('twitter_connected', obj);

                            done(null, {foursquare: {}});
                        });
                    }
                    else {
                        new _schema('system.accounts').init(app).put(account._id.toString(), {
                            user_name: profile.username,
                            display_name: profile.displayName,
                            profile_photo: dot.get(profile, '_json.profile_image_url') || '',
                            token: token,
                            token_secret: tokenSecret
                        }, function(err, affected) {
                            var obj = {
                                account_id: account._id.toString(),
                                token: token,
                                token_secret: tokenSecret,
                                network_id: profile.id
                            }

                            req.session.social.twitter = obj;
                            _emitter.emit('foursquare_connected', obj);

                            done(null, {foursquare: {}});
                        });
                    }
                });
            });
        }));

        app.get('/api/:project/auth/foursquare', passport.authenticate('foursquare'));

        app.get('/api/:project/foursquare/callback', passport.authenticate('foursquare', {
            successRedirect: foursquare.success,
            failureRedirect: foursquare.failure
        }));

    });

};