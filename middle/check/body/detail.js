function CheckBodyDetail(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _middle = 'middle.check.body.detail';
    
    if( ! req.body.detail || req.body.detail == '' ) {
        return next( _resp.Unauthorized({
            middleware: _middle,
            type: 'InvalidCredentials',
            errors: ['detail not found']
        }));
    }

    next();

}

module.exports = function(app) {
    return CheckBodyDetail;
};