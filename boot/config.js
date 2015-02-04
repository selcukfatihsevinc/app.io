var morgan = require('morgan');

module.exports = function(app) {

    var _log = app.system.logger;

    try {
        var _env = app.get('env');

        switch(_env) {
            case 'development':
                app.use(morgan('dev'));
                break;

            case 'testing':
                break;

            case 'production':
                break;

            default:
        }

        return true;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




