var override = require('method-override');

module.exports = function(app) {

    var _log = app.system.logger;

    try {
        app.use(override('X-HTTP-Method-Override'));
        return true;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




