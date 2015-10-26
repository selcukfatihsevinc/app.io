var mongoose = require('mongoose');

module.exports = function(app) {

    var _env   = app.get('env');
    var _log   = app.lib.logger;
    var _conf  = app.config[_env].mongo;
    var _auth  = '';
    var _group = 'CORE:MONGO';

    if( ! _conf )
        return false;

    if(_conf.user && _conf.pass)
        _auth = _conf.user+':'+_conf.pass+'@';

    var str = 'mongodb://'+_auth+_conf.host+':'+_conf.port+'/'+_conf.db;
    var db  = mongoose.connect(str, {
        server: {poolSize: parseInt(_conf.pool) || 10}
    });

    // mongoose set event emitter max listeners
    mongoose.connection.setMaxListeners(0);

    mongoose.connection.on('error', function(err) {
        _log.error(_group, err);
    });

    mongoose.connection.on('open', function() {
        _log.info(_group, 'client connected');
    });

    _log.info(_group+':CONFIG', _conf);
    _log.info(_group+':STRING', str);

    return {db: db, str: str, mongoose: mongoose};

};