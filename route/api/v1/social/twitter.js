var passport = require('passport');
var strategy = require('passport-twitter').Strategy;
var async    = require('async');
var _        = require('underscore');


module.exports = function(app) {

    var _env    = app.get('env');
    var _mdl    = app.middle;
    var _schema = app.lib.schema;
    var _conf   = app.config[_env].social;
    var emitter = app.lib.schemaEmitter;

    /**
     * init passport twitter
     */

    _.each(_conf, function(value, key) {
        var project = key;

        if( ! value.twitter)
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
                            type: 'T',
                            user_id: parseInt(profile.id),
                            user_id_str: profile.id,
                            user_name: profile.username || '',
                            display_name: profile.displayName || '',
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
                            emitter.emit('twitter_connected', obj);

                            done(null, {twitter: {}});
                        });
                    }
                    else {
                        new _schema('system.accounts').init(app).put(account._id.toString(), {
                            user_name: profile.username,
                            display_name: profile.displayName,
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
                            emitter.emit('twitter_connected', obj);

                            done(err, {twitter: {}});
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