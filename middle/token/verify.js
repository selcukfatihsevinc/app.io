function TokenVerify(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;
    var _middle = 'middle.token.verify';
    
    new _schema('system.users').init(req, res, next).get({
        register_token: req.params.token,
        qt: 'one'
    }, function(err, doc) {
        if( ! doc ) {
            return next( _resp.Unauthorized({
                middleware: _middle,
                type: 'InvalidCredentials',
                errors: ['not found token']
            }));
        }
        else if(doc.is_enabled == 'Yes') {
            return next( _resp.Unauthorized({
                middleware: _middle,
                type: 'InvalidCredentials',
                errors: ['enabled user']
            }));
        }

        req.__userData     = doc;
        req.__userData._id = doc._id.toString();

        next();
    });

}

module.exports = function(app) {
    return TokenVerify;
};