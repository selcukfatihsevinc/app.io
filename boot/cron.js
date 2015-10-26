var CronJob = require('cron').CronJob

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:CRON';

    try {
        return CronJob;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




