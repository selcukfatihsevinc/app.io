var elasticsearch = require('elasticsearch');

module.exports = function(app) {

    var _env  = app.get('env');
    var _log  = app.system.logger;
    var _c    = app.config[_env].elasticsearch;
    var _auth = '';

    if( ! _c )
        return false;

    if( ! _c.enabled )
        return false;

    return new elasticsearch.Client(_c);

};