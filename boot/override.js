var override = require('method-override');

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:OVERRIDE';

    try {
        app.use(override('X-HTTP-Method-Override'));
        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




