var dot = require('dotty');

function CheckUsernameExists(req, res, next) {

    var _app      = req.app;
    var _env      = _app.get('env');
    var _resp     = _app.system.response.app;
    var _schema   = _app.lib.schema;
    var _username = req.body.username;

    // eğer username gelmediyse herhangi bir kontrol yapma
    if( ! _username || _username == '' )
        return next();

    var profiles = req.__appData.slug+'.profiles';

    if(dot.get(req.app.model, profiles)) {
        new _schema(profiles).init(req, res, next).get({
            username_lc: _username.toLowerCase(),
            qt: 'one'
        }, function(err, doc) {
            var paths  = ['/api/social', '/api/social/'];
            var pIndex = paths.indexOf(req.path);

            if(pIndex == -1 && doc) {
                return next( _resp.Unauthorized({
                    type: 'InvalidCredentials',
                    errors: ['username exists']}
                ));
            }

            if(doc)
                req.__usernameExists = true;

            next();
        });
    }
    else
        next();

}

module.exports = function(app) {
    return CheckUsernameExists;
};