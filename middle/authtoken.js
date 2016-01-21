function AuthToken(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _token  = req.headers['x-access-token'];
    var _middle = 'middle.authtoken';
    
    if( ! _token || _token == '' ) {
        return next( _resp.Unauthorized({
            middleware: _middle,
            type: 'InvalidCredentials',
            errors: ['access token not found']}
        ));
    }

    next();
}

module.exports = function(app) {
    return AuthToken;
};