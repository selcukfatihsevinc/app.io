var cors = require('cors');

module.exports = function(app) {

    var _log = app.system.logger;

    try {

        app.use(cors());
        app.options('*', cors());

    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};





