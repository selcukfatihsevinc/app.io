var oauthshim = require('oauth-shim');

module.exports = function(app) {

    var _env = app.get('env');
    var _log = app.system.logger;

    try {

        var _conf = app.lib.bootConf(app, 'oauthproxy');
        app.all('/api/oauthproxy', oauthshim);
        oauthshim.init(_conf);

    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};






