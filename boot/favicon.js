var favicon = require('serve-favicon');

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:FAVICON';

    try {
        var fileName = 'favicon.ico';
        var _conf    = app.lib.bootConf(app, 'favicon');
        
        if(_conf && _conf.fileName)
            fileName = _conf.fileName;
        
        app.use(favicon(app.get('basedir')+'/public/'+fileName));
        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




