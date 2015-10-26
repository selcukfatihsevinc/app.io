function System(req, res, next) {

    var _app    = req.app;
    var _env    = _app .get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;

    var method = req.method.toLowerCase();
    var object = req.params.object;

    // eğer sistem objesi değil ise app id'yi almıyoruz
    // (system.users modelinde app id yok, ama system.users ile direkt obje api'si aracılığı ile iletişime geçilmeyecek)
    if(object.indexOf('system.') == -1)
        return next();

    // headers
    var _clientId     = req.headers['x-client-id'];
    var _clientSecret = req.headers['x-client-secret'];

    if( ! _clientId || _clientId == '' || ! _clientSecret || _clientSecret == '' ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['check your client id and client secret']}
        ));
    }

    new _schema('oauth.clients').init(req, res, next).get({
        clientId: _clientId,
        clientSecret: _clientSecret,
        qt: 'one'
    },
    function(err, doc) {
        if( err || ! doc ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['check your client id and client secret']}
            ));
        }

        if(doc.apps)
            req.__systemAppId = doc.apps.toString();

        next();
    });

}

module.exports = function(app) {
    return System;
};

