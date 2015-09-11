module.exports = function(app) {

    var _log = app.system.logger;

    try {
        _log.info('process env', process.env);
        _log.info('app name', app.get('name'));
        _log.info('app env', app.get('env'));
        _log.info('app port', app.get('port'));
        _log.info('app basedir', app.get('basedir'));
        return true;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




