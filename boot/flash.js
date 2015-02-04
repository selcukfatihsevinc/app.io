var flash = require('connect-flash');

module.exports = function(app) {

    var _log = app.system.logger;

    try {
        app.use(flash());
        return true;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




