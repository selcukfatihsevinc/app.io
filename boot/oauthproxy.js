var oauthshim = require('oauth-shim');

module.exports = function(app) {

    var _env   = app.get('env');
    var _log   = app.lib.logger;
    var _group = 'BOOT:OAUTHPROXY';

    try {
        var _conf = app.lib.bootConf(app, 'oauthproxy');
        app.all('/api/oauthproxy', oauthshim);
        oauthshim.init(_conf);
        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};






