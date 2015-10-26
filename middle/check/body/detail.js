function CheckBodyDetail(req, res, next) {

    var _app  = req.app;
    var _env  = _app.get('env');
    var _resp = _app.system.response.app;

    if( ! req.body.detail || req.body.detail == '' ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['detail not found']
        }));
    }

    next();

}

module.exports = function(app) {
    return CheckBodyDetail;
};