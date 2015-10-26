var body = require('body-parser');

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:BODY';

    try {
        var _conf = app.lib.bootConf(app, 'body');

        app.use(body.urlencoded(_conf.urlencoded || {}));
        app.use(body.json(_conf.json || {}));

        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




