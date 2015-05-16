var mailer = require('nodemailer');
var pool   = require('nodemailer-smtp-pool');

module.exports = function(app) {

    var _log = app.system.logger;

    try {
        var _conf = app.lib.bootConf(app, 'mailer');

        if( ! _conf )
            return false;

        return mailer.createTransport(pool(_conf));
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};





