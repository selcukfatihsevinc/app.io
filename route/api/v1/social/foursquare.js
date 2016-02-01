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

                profile = dot.get(profile, '_json.response.user');
                    
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
                    
                    // set display name
                    var displayName = '';
                    
                    if(profile.firstName) {
                        displayName += profile.firstName;
                        
                        if(profile.lastName)
                            displayName += ' '+profile.lastName;
                    }
                    
                    // set profile photo
                    var profilePhoto = '';
                    
                    if(profile.photo && profile.photo.prefix && profile.photo.suffix)
                        profilePhoto = profile.photo.prefix+'original'+profile.photo.suffix

                    if( ! account ) {
                        new _schema('system.accounts').init(app).post({
                            apps: apps._id.toString(),
                            type: 'FS',
                            user_id: parseInt(profile.id),
                            user_id_str: profile.id,
                            user_name: profile.id || '',
                            display_name: displayName,
                            profile_photo: profilePhoto,
                            token: token
                        }, function(err, doc) {
                            if(err) {
                                console.log(err);
                                return done(err);
                            }

                            var obj = {
                                account_id: doc._id.toString(),
                                token: token,
                                network_id: profile.id
                            }

                            req.session.social.foursquare = obj;
                            _emitter.emit('foursquare_connected', obj);

                            done(null, {foursquare: {}});
                        });
                    }
                    else {
                        new _schema('system.accounts').init(app).put(account._id.toString(), {
                            user_name: profile.id || '',
                            display_name: displayName,
                            profile_photo: profilePhoto,
                            token: token
                        }, function(err, affected) {
                            var obj = {
                                account_id: account._id.toString(),
                                token: token,
                                network_id: profile.id
                            }

                            req.session.social.foursquare = obj;
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