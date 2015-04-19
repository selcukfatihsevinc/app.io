var async = require('async');

function AppUser(req, res, next) {

    var _app    = req.app;
    var _env    = _app .get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;

    if( ! req.appId ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['app id not found']}
        ));
    }

    new _schema('system.apps').init(req, res, next).getById(req.appId, function(err, doc) {
        if( ! doc ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['app not found']}
            ));
        }

        req.appData = doc;
        next();
    });

}

module.exports = function(app) {
    return AppUser;
};