var async = require('async');
var dot   = require('dotty');

function Access(req, res, next) {

    var _app    = req.app;
    var _env    = _app .get('env');
    var _resp   = _app.system.response.app;
    var _auth   = _app.config[_env].auth; // auth config
    var _schema = _app.lib.schema;
    var _path   = req.route.path;

    // check endpoint status
    var access = dot.get(_auth, req.appData.slug+'.'+_path);

    if(_auth && _auth[req.appData.slug] && ! access ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['endpoint not allowed']}
        ));
    }
    else
        next();

}

module.exports = function(app) {
    return Access;
};