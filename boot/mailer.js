var mailer = require('nodemailer');
var _      = require('underscore');

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:MAILER';

    try {
        var _conf = app.lib.bootConf(app, 'mailer');

        if( ! _conf )
            return false;

        // birden fazla config varsa hepsi için client oluşturuyoruz
        if( ! _conf.service ) {
            var obj = {};
            _.each(_conf, function(val, key) {
                obj[key] = mailer.createTransport(val);
            });

            return obj;
        }
        
        return mailer.createTransport(_conf);
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};





