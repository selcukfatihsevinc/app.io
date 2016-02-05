var winston = require('winston');
var _       = require('underscore');

module.exports = function(app) {

    var _env  = app.get('env');
    var _conf = app.config[_env].logger; // logger config

    winston.emitErrs = false; // don't supress errors
    var logger = new winston.Logger({exitOnError: false});

    // add transport
    logger.add(winston.transports[_conf.transport], _conf.options);

    return logger;

};

