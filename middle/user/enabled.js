function UserEnabled(req, res, next) {

    var _app      = req.app;
    var _env      = _app.get('env');
    var _resp     = _app.system.response.app;
    var _schema   = _app.lib.schema;
    var _userData = req.__userData;
    var paths     = ['/api/social', '/api/social/'];
    var pIndex    = paths.indexOf(req.path);
    var _middle   = 'middle.user.enabled';
    
    // yukarıdaki path'ler için user data kontrol etmiyoruz
    if( pIndex == -1 && ! _userData ) {
        return next( _resp.Unauthorized({
            middleware: _middle,
            type: 'InvalidCredentials',
            errors: ['not found user data']
        }));
    }
    else if(_userData && _userData.is_enabled == 'No') {
        return next( _resp.Unauthorized({
            middleware: _middle,
            type: 'InvalidCredentials',
            errors: ['not enabled user']
        }));
    }

    next();

}

module.exports = function(app) {
    return UserEnabled;
};