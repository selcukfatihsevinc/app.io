var redis = require('redis');
var dot   = require('dotty');

module.exports = function(app, cb) {

    var _env    = app.get('env');
    var _conf   = app.config[_env].redis || dot.get(app.config[_env], 'data.redis');
    var _log    = app.lib.logger;
    var _worker = app.get('workerid');
    var _sConf  = app.config[_env].sync;
    var _logs   = dot.get(_sConf, 'data.core');
    var _group  = 'W'+_worker+':CORE:REDIS';

    if( ! _conf ) {
        _log.info(_group, 'redis conf not found!', 'red');
        return false;
    }

    var clientA = redis.createClient(_conf.port, _conf.host);
    var clientB = redis.createClient(_conf.port, _conf.host);

    if(_conf.pass) {
        clientA.auth(_conf.pass);
        clientB.auth(_conf.pass);
    }

    var conn = 0;
    clientA.on('connect', function () {
        if(_logs)
            _log.info(_group, 'client A connected', 'black');

        conn++;
        if(conn == 2) cb();
    });

    clientB.on('connect', function () {
        if(_logs)
            _log.info(_group, 'client B connected', 'black');

        conn++;
        if(conn == 2) cb();
    });

    if(_logs)
        _log.info(_group, _conf, 'black');

    return app.core.redis = {
        a: clientA,
        b: clientB
    };
    
};