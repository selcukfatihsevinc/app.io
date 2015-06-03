var mongoose = require('mongoose');

module.exports = function(app) {

    var _env  = app.get('env');
    var _log  = app.system.logger;
    var _c    = app.config[_env].mongo;
    var _auth = '';

    if( ! _c )
        return false;

    if(_c.user && _c.pass)
        _auth = _c.user+':'+_c.pass+'@';

    var str = 'mongodb://'+_auth+_c.host+':'+_c.port+'/'+_c.db;
    var db  = mongoose.connect(str, {
        server: {poolSize: parseInt(_c.pool) || 10}
    });

    // _log.info('mongo config', _c);
    // _log.info('mongo str', str);

    mongoose.connection.on('error', function(err) {
        _log.error(err);
    });

    mongoose.connection.on('open', function() {
        _log.info('mongodb client connected');
    });

    return {db: db, str: str, mongoose: mongoose};

};