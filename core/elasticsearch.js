var elasticsearch = require('elasticsearch');

module.exports = function(app) {

    var _env   = app.get('env');
    var _log   = app.lib.logger;
    var _conf  = app.config[_env].elasticsearch;
    var _group = 'CORE:ELASTICSEARCH';

    if( ! _conf )
        return false;

    if( ! _conf.enabled )
        return false;

    _log.info(_group+':CONFIG', _conf);

    return new elasticsearch.Client(_conf);

};