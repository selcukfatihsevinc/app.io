var kue = require('kue');

module.exports = function(app) {

    var _env   = app.get('env');
    var _log   = app.lib.logger;
    var _group = 'BOOT:KUE_UI';

    try {
        // mount ui
        app.use('/admin/kue', kue.app);
        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};







