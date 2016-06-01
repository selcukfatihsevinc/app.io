var short = require('short');

module.exports = function(app) {

    var _env   = app.get('env');
    var _log   = app.lib.logger;
    var _group = 'BOOT:SHORTENER';

    try {
        short.run(app.core.mongo.mongoose);
        return short;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




