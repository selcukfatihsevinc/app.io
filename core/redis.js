var redis = require('redis');

module.exports = function(app) {

    var _env   = app.get('env');
    var _conf  = app.config[_env].redis;
    var _log   = app.lib.logger;
    var _group = 'CORE:REDIS';

    if( ! _conf )
        return false;

    var clientA = redis.createClient(_conf.port, _conf.host);
    var clientB = redis.createClient(_conf.port, _conf.host);

    if(_conf.pass) {
        clientA.auth(_conf.pass);
        clientB.auth(_conf.pass);
    }

    clientA.on('connect', function () {
        _log.info(_group, 'client A connected');
    });

    clientB.on('connect', function () {
        _log.info(_group, 'client B connected');
    });

    _log.info(_group, _conf);

    return {a: clientA, b: clientB};

};