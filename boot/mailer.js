var mailer = require('nodemailer');

module.exports = function(app) {

    var _log = app.system.logger;

    try {
        var _conf = app.lib.bootConf(app, 'mailer');

        if( ! _conf )
            return false;

        return mailer.createTransport(_conf);
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




