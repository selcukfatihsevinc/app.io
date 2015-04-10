var Sequelize = require('sequelize');

module.exports = function(app) {

    var _env = app.get('env');
    var _log = app.system.logger;
    var _c   = app.config[_env].db;

    // _log.info('db config', _c);

    if( ! _c )
        return false;

    if( ! _c.enabled )
        return false;

    return new Sequelize(_c.uri);

};