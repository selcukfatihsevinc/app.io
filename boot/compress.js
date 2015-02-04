var compress = require('compression');

module.exports = function(app) {

    var _log = app.system.logger;

    try {
        app.use(compress());
        return true;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




