var socketioJwt = require('socketio-jwt');

module.exports = function(app) {

    var _log  = app.system.logger;
    var _env  = app.get('env');
    var _conf = app.config[_env].api; // api config

    try {

        app.io.use(socketioJwt.authorize({
            secret: _conf.token.secret,
            handshake: true
        }));

        return true;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




