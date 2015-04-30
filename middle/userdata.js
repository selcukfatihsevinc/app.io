var async = require('async');

function UserData(req, res, next) {

    var _app    = req.app;
    var _env    = _app .get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;

    if( ! req.user || ! req.user.id ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['user not found']}
        ));
    }

    new _schema('elchi.profiles').init(req, res, next).get({users: req.user.id, qt: 'one'}, function(err, doc) {
        if( err || ! doc ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['profile not found']}
            ));
        }

        req.userData     = doc;
        req.userData._id = doc._id.toString();

        next();
    });

}

module.exports = function(app) {
    return UserData;
};