var dot = require('dotty');

function DataQueryEmail(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;
    var _email  = req.query.email;

    if( ! _email || _email == '' ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['user email not found']
        }));
    }

    new _schema('system.users').init(req, res, next).get({email: _email, qt: 'one'}, function(err, doc) {
        if( err || ! doc ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['user data not found']}
            ));
        }

        req.__queryUser     = doc;
        req.__queryUser._id = doc._id.toString();

        next();
    });

}

module.exports = function(app) {
    return DataQueryEmail;
};