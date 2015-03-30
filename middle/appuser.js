var async = require('async');

function AppUser(req, res, next) {

    var _app    = req.app;
    var _env    = _app .get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;

    var a = {
        app: function(cb) {
            new _schema('system.apps').init(req, res, next).getById(req.appId, function(err, doc) {
                cb(err, doc);
            });
        },
        user: function(cb) {
            var obj = {
                apps: req.appId,
                email: req.body.email,
                qt: 'one'
            };

            new _schema('system.users').init(req, res, next).get(obj, function(err, doc) {
                cb(err, doc);
            });
        }
    };

    async.parallel(a, function(err, results) {

        if( ! results.user ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['email not found']}
            ));
        }

        req.appData      = results.app;
        req.userData     = results.user;
        req.userData._id = req.userData._id.toString();

        next();
    });

}

module.exports = function(app) {
    return AppUser;
};