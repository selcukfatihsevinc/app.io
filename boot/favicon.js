var favicon = require('serve-favicon');

module.exports = function(app) {

    var _log = app.system.logger;

    try {
        app.use(favicon(app.get('basedir')+'/public/favicon.ico'));
        return true;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




