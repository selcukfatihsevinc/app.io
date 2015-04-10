function System(req, res, next) {

    var _app    = req.app;
    var _env    = _app .get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;

    var method = req.method.toLowerCase();
    var object = req.params.object;

    // eğer sistem objesi ise app id'yi alıyoruz
    if(object.indexOf('system.') != -1) {
        if( ! req.headers['x-client-id'] || ! req.headers['x-client-secret'] ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['check your client id and client secret']}
            ));
        }

        new _schema('oauth.clients').init(req, res, next).get({
            clientId: req.headers['x-client-id'],
            clientSecret: req.headers['x-client-secret'],
            qt: 'one'
        },
        function(err, doc) {
            if( err || ! doc ) {
                return next( _resp.Unauthorized({
                    type: 'InvalidCredentials',
                    errors: ['check your client id and client secret']}
                ));
            }

            req.system_AppId = doc.apps.toString();

            next();
        });
    }
    else
        return next();

}

module.exports = function(app) {
    return System;
};

