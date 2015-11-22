var mongoose = require('mongoose');
var dot      = require('dotty');

module.exports = function(app) {

    var _env    = app.get('env');
    var _log    = app.lib.logger;
    var _conf   = app.config[_env].mongo;
    var _auth   = '';
    var _worker = app.get('workerid');
    var _sConf  = app.config[_env].sync;
    var _logs   = dot.get(_sConf, 'data.core');
    var _group  = 'W'+_worker+':CORE:MONGO';

    if( ! _conf )
        return false;

    if(_conf.user && _conf.pass)
        _auth = _conf.user+':'+_conf.pass+'@';

    var str = 'mongodb://'+_auth+_conf.host+':'+_conf.port+'/'+_conf.db;
    var db  = mongoose.connect(str, {
        server: {poolSize: parseInt(_conf.pool) || 10},
        config: {autoIndex: _conf.autoIndex || false}
    });

    // mongoose set event emitter max listeners
    mongoose.connection.setMaxListeners(0);

    mongoose.connection.on('error', function(err) {
        _log.error(_group, err);
    });

    mongoose.connection.on('open', function() {
        if(_logs)
            _log.info(_group, 'client connected', 'black');
    });

    if(_logs) {
        _log.info(_group+':CONFIG', _conf, 'black');
        _log.info(_group+':STRING', str, 'black');
    }

    return {db: db, str: str, mongoose: mongoose};

};