var solr = require('solr-client');
var dot  = require('dotty');

module.exports = function(app) {

    var _env    = app.get('env');
    var _log    = app.lib.logger;
    var _conf   = app.config[_env].solr;
    var _worker = app.get('workerid');
    var _sConf  = app.config[_env].sync;
    var _logs   = dot.get(_sConf, 'data.core');
    var _group  = 'W'+_worker+':CORE:SOLR';

    if( ! _conf )
        return false;

    if( ! _conf.enabled )
        return false;

    if(_logs)
        _log.info(_group+':CONFIG', _conf, 'black');

    return solr.createClient(_conf);

};