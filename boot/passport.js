var passport = require('passport');

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:PASSPORT';

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
        _log.error(_group, e.stack);
        return false;
    }

};




