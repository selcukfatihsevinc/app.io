var session = require('express-session');
var store   = require('connect-redis')(session);

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:SESSION';

    try {
        // get config
        var _conf = app.lib.bootConf(app, 'session');
        _conf = _conf || {};
        _conf.store = new store({client: app.core.redis.a});

        // session
        app.use(session(_conf))
        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




