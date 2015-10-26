function Client(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;

    // headers
    var _clientId     = req.headers['x-client-id'];
    var _clientSecret = req.headers['x-client-secret'];
        
    if( ! _clientId || _clientId == '' || ! _clientSecret || _clientSecret == '' ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['check your client id and client secret headers']}
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

        req.__appId = doc.apps.toString();

        next();
    });

}

module.exports = function(app) {
    return Client;
};

