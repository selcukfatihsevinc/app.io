var solr = require('solr-client');

module.exports = function(app) {

    var _env = app.get('env');
    var _log = app.system.logger;
    var _c   = app.config[_env].solr;

    _log.info('solr config', _c);

    if( ! _c )
        return false;

    if( ! _c.enabled )
        return false;

    return solr.createClient(_c);

};