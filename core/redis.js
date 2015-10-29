var redis = require('redis');
var dot   = require('dotty');

module.exports = function(app) {

    var _env    = app.get('env');
    var _conf   = app.config[_env].redis;
    var _log    = app.lib.logger;
    var _worker = app.get('workerid');
    var _sConf  = app.config[_env].sync;
    var _logs   = dot.get(_sConf, 'data.core');
    var _group  = 'W'+_worker+':CORE:REDIS';

    if( ! _conf )
        return false;

    var clientA = redis.createClient(_conf.port, _conf.host);
    var clientB = redis.createClient(_conf.port, _conf.host);

    if(_conf.pass) {
        clientA.auth(_conf.pass);
        clientB.auth(_conf.pass);
    }

    clientA.on('connect', function () {
        if(_logs)
            _log.info(_group, 'client A connected', 'black');
    });

    clientB.on('connect', function () {
        if(_logs)
            _log.info(_group, 'client B connected', 'black');
    });

    if(_logs)
        _log.info(_group, _conf, 'black');

    return {a: clientA, b: clientB};

};