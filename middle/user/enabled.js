function Enabled(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;

    if( ! req.userData ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['not found user data']
        }));
    }
    else if(req.userData.is_enabled == 'No') {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['not enabled user']
        }));
    }

    next();

}

module.exports = function(app) {
    return Enabled;
};