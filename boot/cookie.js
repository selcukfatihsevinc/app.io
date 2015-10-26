var cookie = require('cookie-parser');

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:COOKIE';

    try {
        app.use(cookie());
        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




