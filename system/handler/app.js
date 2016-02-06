function error(err, req, res, next) {

    var _app = req.app;
    var _log = _app.system.logger;
    var _api = res.__api || res.__json;

    // error
    var code    = err.code || 500;
    var name    = err.name || 'InternalServerError';
    var message = err.message || false;
    var type    = err.type || false;

    console.log(err);
    _log.error(err.stack);

    var response = {
        meta: {
            name : name,
            code : code
        }
    };

    if(message)
        response.meta.message = message;

    if(type)
        response.meta.type = type;

    if( ! _api && code == 500)
        return res.render('admin/error/500');

    res.status(code).json(response);

}

function notFound(req, res, next) {
    next( req.app.system.response.app.NotFound() );
}

module.exports = function(app) {

    app.all('*', notFound);
    app.use(error);

    return true;

};