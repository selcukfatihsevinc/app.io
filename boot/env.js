module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:ENV';

    try {
        _log.info(_group+':PROCESS_ENV', process.env);
        _log.info(_group+':APP_NAME', app.get('name'));
        _log.info(_group+':APP_ENV', app.get('env'));
        _log.info(_group+':APP_PORT', app.get('port'));
        _log.info(_group+':APP_BASEDIR', app.get('basedir'));
        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




