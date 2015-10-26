function UserData(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;

    if( ! req.__user || ! req.__user.id ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['user not found']}
        ));
    }

    new _schema('system.users').init(req, res, next).getById(req.__user.id, function(err, doc) {
        if( err || ! doc ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['user not found']}
            ));
        }

        req.__userData     = doc;
        req.__userData._id = doc._id.toString();

        next();
    });
}

module.exports = function(app) {
    return UserData;
};