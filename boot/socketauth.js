var socketioJwt = require('socketio-jwt');

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _env   = app.get('env');
    var _conf  = app.config[_env].api; // api config
    var _group = 'BOOT:SOCKETAUTH';

    try {
        app.io.use(socketioJwt.authorize({
            secret: _conf.token.secret,
            handshake: true
        }));

        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




