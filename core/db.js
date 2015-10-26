var Sequelize = require('sequelize');

module.exports = function(app) {

    var _env   = app.get('env');
    var _log   = app.lib.logger;
    var _conf  = app.config[_env].db;
    var _group = 'CORE:DB';

    if( ! _conf )
        return false;

    if( ! _conf.enabled )
        return false;

    _log.info(_group+':CONFIG', _conf);

    return new Sequelize(_conf.uri);

};