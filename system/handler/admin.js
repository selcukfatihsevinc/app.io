var php = require('phpjs');

function error(err, req, res, next) {

    var _app    = req.app;
    var _log    = _app.system.logger;
    var code    = err.code || 500;
    var name    = err.name || 'InternalServerError';
    var message = err.message || null;

    _log.error(err.stack);

    var response = {
        meta: {
            name    : name,
            code    : code,
            message : message
        }
    };

    if(code == 500)
        return res.render('admin/error/500');

    res.status(code).json(response);

}

module.exports = function(app) {

    // 404 not found routes
    app.use(function(req, res) {
        res.render('admin/error/404');
    });

    app.use(error);

    return true;

};