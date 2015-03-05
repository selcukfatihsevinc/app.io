module.exports = function(app) {

    var _log = app.system.logger;

    try {
        app.disable('x-powered-by');
        return true;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};



