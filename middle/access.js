var dot = require('dotty');

function Access(req, res, next) {

    var _app  = req.app;
    var _env  = _app.get('env');
    var _resp = _app.system.response.app;
    var _auth = _app.config[_env].auth; // auth config
    var _path = req.path;
    var _slug = req.__appData.slug;

    // check endpoint status
    var access = dot.get(_auth, _slug+'.'+_path);

    if(_auth && _auth[_slug] && ! access ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['endpoint not allowed']}
        ));
    }

    next();

}

module.exports = function(app) {
    return Access;
};