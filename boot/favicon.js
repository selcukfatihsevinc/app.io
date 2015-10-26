var favicon = require('serve-favicon');

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:FAVICON';

    try {
        app.use(favicon(app.get('basedir')+'/public/favicon.ico'));
        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




