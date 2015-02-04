var CronJob = require('cron').CronJob

module.exports = function(app) {

    var _log = app.system.logger;

    try {
        return CronJob;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




