var mailer = require('nodemailer');
var pool   = require('nodemailer-smtp-pool');

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:MAILER';

    try {
        var _conf = app.lib.bootConf(app, 'mailer');

        if( ! _conf )
            return false;

        return mailer.createTransport(pool(_conf));
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};





