var compress = require('compression');

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:COMPRESS';

    try {
        app.use(compress());
        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




