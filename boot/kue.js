var kue = require('kue');

module.exports = function(app) {

    var _env   = app.get('env');
    var _log   = app.lib.logger;
    var _conf  = app.config[_env].redis;
    var _group = 'BOOT:KUE';

    try {
        var redisObj = {
            port: _conf.port,
            host: _conf.host
        };

        if(_conf.pass)
            redisObj.auth = _conf.pass;

        var queue = kue.createQueue({
            prefix: 'q',
            redis: redisObj,
            disableSearch: true,
            jobEvents: false
        });

        queue.watchStuckJobs(_conf.stuckInterval || 5000);
        
        return queue;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




