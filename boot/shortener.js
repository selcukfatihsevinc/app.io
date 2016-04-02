var short = require('short');

module.exports = function(app) {

    var _env   = app.get('env');
    var _log   = app.lib.logger;
    var _group = 'BOOT:SHORTENER';

    try {
        var _str = app.core.mongo.str;

        // connect to mongodb
        short.connect(_str);

        short.connection.on('error', function(error) {
            throw new Error(error);
        });

        return short;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




