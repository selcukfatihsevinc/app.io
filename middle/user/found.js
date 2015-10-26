var async = require('async');

function UserFound(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;
    var _email  = req.body.email;

    if( ! _email || _email == '' ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['email not found']}
        ));
    }

    var obj = {
        email: _email.toLowerCase(),
        qt: 'one'
    };

    new _schema('system.users').init(req, res, next).get(obj, function(err, doc) {
        if(doc) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['user found']}
            ));
        }

        next();
    });

}

module.exports = function(app) {
    return UserFound;
};