var solr = require('solr-client');

module.exports = function(app) {

    var _env   = app.get('env');
    var _log   = app.lib.logger;
    var _conf  = app.config[_env].solr;
    var _group = 'CORE:SOLR';

    if( ! _conf )
        return false;

    if( ! _conf.enabled )
        return false;

    _log.info(_group+':CONFIG', _conf);

    return solr.createClient(_conf);

};