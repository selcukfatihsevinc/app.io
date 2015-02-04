function error(err, req, res, next) {

    var _app    = req.app;
    var _log    = _app.system.logger;
    var code    = err.code || 500;
    var name    = err.name || 'InternalServerError';
    var message = err.message || false;
    var type    = err.type || false;

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

    res.status(code).json(response);

}

function notFound(req, res, next) {
    next(req.app.system.response.api.NotFound());
}

module.exports = function(app) {

    app.all('*', notFound);
    app.use(error);

    return true;

};