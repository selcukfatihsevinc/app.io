var cors = require('cors');

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:CORS';

    try {
        app.use(cors());
        app.options('*', cors());
        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};





