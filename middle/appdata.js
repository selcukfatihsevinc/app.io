function AppData(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;
    var _middle = 'middle.appdata';
    
    if( ! req.__appId ) {
        return next( _resp.Unauthorized({
            middleware: _middle,
            type: 'InvalidCredentials',
            errors: ['app id not found']}
        ));
    }

    new _schema('system.apps').init(req, res, next).getById(req.__appId, function(err, doc) {
        if( ! doc ) {
            return next( _resp.Unauthorized({
                middleware: _middle,
                type: 'InvalidCredentials',
                errors: ['app not found']}
            ));
        }

        req.__appData     = doc;
        req.__appData._id = doc._id.toString();

        next();
    });

}

module.exports = function(app) {
    return AppData;
};