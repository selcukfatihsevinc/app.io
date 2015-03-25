var kue = require('kue');

module.exports = function(app) {

    var _env = app.get('env');
    var _log = app.system.logger;

    try {

        // mount ui
        app.use('/admin/kue', kue.app);

    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};







