function Reset(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;

    new _schema('system.users').init(req, res, next).get({reset_token: req.params.token, qt: 'one'}, function(err, doc) {
        if( ! doc ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['not found token']
            }));
        }
        else if(doc.is_enabled == 'No') {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['not enabled user']
            }));
        }

        var expires = doc.reset_expires.getTime();
        var now     = new Date().getTime();

        if(now > expires) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['expired token']
            }));
        }

        req.userData     = doc;
        req.userData._id = req.userData._id.toString();

        next();
    });

}

module.exports = function(app) {
    return Reset;
};