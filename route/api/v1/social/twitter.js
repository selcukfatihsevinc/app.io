var passport = require('passport');
var strategy = require('passport-twitter').Strategy;
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
    var _group   = 'AUTH:SOCIAL:TWITTER';
    
    /**
     * init passport twitter
     */

    _.each(_conf, function(value, key) {
        var project = key;

        if( ! value.twitter || ! value.twitter.enable )
            return;

        var twitter = value.twitter;

        passport.use(new strategy({
            consumerKey: twitter.key,
            consumerSecret: twitter.secret,
            callbackURL: twitter.callback,
            passReqToCallback : true
        },
        function(req, token, tokenSecret, profile, done) {
            var project = req.params.project;
            _log.info(_group+':PROJECT', project);
            _log.info(_group+':QS', req.query);
            
            new _schema('system.apps').init(app).get({
                slug: project,
                qt: 'one'
            }, function(err, apps) {
                if(err) {
                    console.log(err);
                    _log.info(_group, 'app not found');
                    return done(null);                    
                }

                new _schema('system.accounts').init(app).get({
                    apps: apps._id.toString(),
                    user_id: parseInt(profile.id),
                    qt: 'one'
                }, function(err, account) {

                    if(err) {
                        console.log(err);
                        if(err.name != 'NotFound')
                            return done(null);                        
                    }

                    if( ! req.session.social )
                        req.session.social = {};

                    var profilePhoto = dot.get(profile, '_json.profile_image_url') || '';
                    var location     = dot.get(profile, '_json.location') || '';
                    
                    var sessionObj   = {
                        network_id: parseInt(profile.id),
                        network_id_str: profile.id,
                        user_name: profile.username || '',
                        display_name: profile.displayName || '',
                        profile_photo: profilePhoto,
                        location: location,
                        token: token,
                        token_secret: tokenSecret
                    };
                            
                    _log.info(_group+'SESSION_OBJ', sessionObj);
                    
                    if( ! account ) {
                        new _schema('system.accounts').init(app).post({
                            apps: apps._id.toString(),
                            type: 'T',
                            user_id: parseInt(profile.id),
                            user_id_str: profile.id,
                            user_name: profile.username || '',
                            display_name: profile.displayName || '',
                            profile_photo: profilePhoto,
                            location: location,
                            token: token,
                            token_secret: tokenSecret,
                        }, function(err, doc) {
                            if(err) {
                                console.log(err);
                                return done(null);
                            }

                            sessionObj.account_id = doc._id.toString();
                            req.session.social.twitter = sessionObj;
                            _emitter.emit('twitter_connected', sessionObj);

                            done(null, {twitter: {}});
                        });
                    }
                    else {
                        new _schema('system.accounts').init(app).put(account._id.toString(), {
                            user_name: profile.username,
                            display_name: profile.displayName,
                            profile_photo: profilePhoto,
                            location: location,
                            token: token,
                            token_secret: tokenSecret
                        }, function(err, affected) {
                            if(err)
                                console.log(err);
                            
                            sessionObj.account_id = account._id.toString();
                            req.session.social.twitter = sessionObj;
                            _emitter.emit('twitter_connected', sessionObj);

                            done(null, {twitter: {}});
                        });
                    }
                });
            });
        }));

        app.get('/api/:project/auth/twitter', passport.authenticate('twitter'));

        app.get('/api/:project/twitter/callback', passport.authenticate('twitter', {
            successRedirect: twitter.success,
            failureRedirect: twitter.failure
        }));

    });

};