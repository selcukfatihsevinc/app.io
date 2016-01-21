function CheckBodyPassword(req, res, next) {

    var _app  = req.app;
    var _env  = _app.get('env');
    var _resp = _app.system.response.app;
    var _middle = 'middle.check.body.password';
    
    if( ! req.body.password || req.body.password == '' ) {
        return next( _resp.Unauthorized({
            middleware: _middle,
            type: 'InvalidCredentials',
            errors: ['password not found']
        }));
    }

    next();

}

module.exports = function(app) {
    return CheckBodyPassword;
};