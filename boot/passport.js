var passport = require('passport');

module.exports = function(app) {

    var _log = app.system.logger;

    try {
        app.use(passport.initialize());
        app.use(passport.session());

        passport.serializeUser(function(user, done) {
            done(null, user);
        });

        passport.deserializeUser(function(user, done) {
            done(null, user);
        });

        return true;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




