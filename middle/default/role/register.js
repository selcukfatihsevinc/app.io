var dot = require('dotty');

function DefaultRoleRegister(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;
    var _slug   = req.__appData.slug;
    var _middle = 'middle.default.role.register';
    
    var role = dot.get(_app.config[_env], 'roles.'+_slug+'.initial.register');

    if ( ! role ) {
        return next(_resp.Unauthorized({
            middleware: _middle,
            type: 'InvalidCredentials',
            errors: ['initial role config not found (register)']
        }));
    }

    // get role by slug
    new _schema('system.roles').init(req, res, next).get({
        apps: req.__appId,
        slug: role,
        qt: 'one'
    }, function(err, role) {
        if ( err || ! role ) {
            return next(_resp.Unauthorized({
                middleware: _middle,
                type: 'InvalidCredentials',
                errors: ['initial role not found (register)']
            }));
        }

        req.__defaultRole = role._id.toString(),

        next();
    });

}

module.exports = function(app) {
    return DefaultRoleRegister;
};