var morgan = require('morgan');

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:CONFIG';

    try {
        var _env  = app.get('env');

        var _skip = function (req, res) {
            return req.baseUrl == '/admin/kue';
        }

        switch(_env) {
            case 'development':
                app.use(morgan('dev', {skip: _skip}));
                break;

            case 'testing':
                app.use(morgan('short', {skip: _skip}));
                break;

            case 'production':
                app.use(morgan('short', {skip: _skip}));
                break;

            default:
        }

        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




