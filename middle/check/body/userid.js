function CheckBodyUserid(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _userId = req.body.user_id;
    var _middle = 'middle.check.body.userid';
    
    if( ! _userId || _userId == '' ) {
        return next( _resp.Unauthorized({
            middleware: _middle,
            type: 'InvalidCredentials',
            errors: ['user id not found']
        }));
    }

    next();

}

module.exports = function(app) {
    return CheckBodyUserid;
};