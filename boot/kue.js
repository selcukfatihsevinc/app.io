var kue = require('kue');

module.exports = function(app) {

    var _env = app.get('env');
    var _log = app.system.logger;
    var _c   = app.config[_env].redis;

    try {

        var redisObj = {
            port: _c.port,
            host: _c.host
        };

        if(_c.pass)
            redisObj.auth = _c.pass;

        return kue.createQueue({
            prefix: 'q',
            redis: redisObj,
            disableSearch: true,
            jobEvents: false
        });

    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




