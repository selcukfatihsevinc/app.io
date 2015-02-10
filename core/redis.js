var redis = require('redis');

module.exports = function(app) {

    var _env = app.get('env');
    var _log = app.system.logger;
    var _c   = app.config[_env].redis;

    _log.info('redis config', _c);

    if( ! _c )
        return false;

    var clientA = redis.createClient(_c.port, _c.host);
    var clientB = redis.createClient(_c.port, _c.host);

    if(_c.pass) {
        clientA.auth(_c.pass);
        clientB.auth(_c.pass);
    }

    clientA.on('connect', function () {
        _log.info('redis client A connected');
    });

    clientB.on('connect', function () {
        _log.info('redis client B connected');
    });

    return {a: clientA, b: clientB};

};