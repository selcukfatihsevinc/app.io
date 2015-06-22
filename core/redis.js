var redis = require('redis');

module.exports = function(app) {

    var _env   = app.get('env');
    var _c     = app.config[_env].redis;
    var _log   = app.lib.logger;
    var _group = 'CORE:REDIS';

    _log.info(_group, _c);

    if( ! _c )
        return false;

    var clientA = redis.createClient(_c.port, _c.host);
    var clientB = redis.createClient(_c.port, _c.host);

    if(_c.pass) {
        clientA.auth(_c.pass);
        clientB.auth(_c.pass);
    }

    clientA.on('connect', function () {
        _log.info(_group, 'client A connected');
    });

    clientB.on('connect', function () {
        _log.info(_group, 'client B connected');
    });

    return {a: clientA, b: clientB};

};