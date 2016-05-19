var mailer = require('nodemailer');
var pool   = require('nodemailer-smtp-pool');

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:MAILERPOOL';

    try {
        var _conf = app.lib.bootConf(app, 'mailer');

        if( ! _conf )
            return false;

        /**
         * @TODO
         * pool için de multiple domain ayarları yapılacak
         */
        
        return mailer.createTransport(pool(_conf));
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};





