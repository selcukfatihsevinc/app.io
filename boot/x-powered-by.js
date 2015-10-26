module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:X_POWERED_BY';

    try {
        app.disable('x-powered-by');
        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};



