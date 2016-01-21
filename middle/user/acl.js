var dot = require('dotty');
var _   = require('underscore');

function UserAcl(object, perm) {
    var slug = object.replace('.', '_');
    
    return function(req, res, next) {
        var _app    = req.app;
        var _env    = _app.get('env');
        var _resp   = _app.system.response.app;
        var _helper = _app.lib.utils.helper;
        var _middle = 'middle.user.acl';
        
        _app.acl.allowedPermissions(req.__user.id, slug, function(err, results) {
            var perms = dot.get(results, slug);

            if( err || ! perms ) {
                return next( _resp.Unauthorized({
                    middleware: _middle,
                    type: 'InvalidCredentials',
                    errors: ['not found acl perms']}
                ));
            }
            else if( ! perms.length ) {
                return next( _resp.Unauthorized({
                    middleware: _middle,
                    type: 'InvalidCredentials',
                    errors: ['not found acl perms']}
                ));
            }
            
            if(perm) {
                if(perms.indexOf(perm) == -1) {
                    return next( _resp.Unauthorized({
                        middleware: _middle,
                        type: 'InvalidCredentials',
                        errors: ['not allowed acl perms']}
                    ));
                }
            }
            
            perms = slug = null;
            
            next();
        });
        
    }

}

module.exports = function(app) {
    return UserAcl;
};