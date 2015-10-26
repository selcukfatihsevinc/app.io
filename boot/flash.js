var flash = require('connect-flash');

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:FLASH';

    try {
        app.use(flash());
        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




