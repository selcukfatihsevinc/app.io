var cookie = require('cookie-parser');

module.exports = function(app) {

    var _log = app.system.logger;

    try {
        app.use(cookie());
        return true;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




