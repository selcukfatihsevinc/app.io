function UserProfile(req, res, next) {

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

    var _profiles = req.__appData.slug+'.profiles';
    var _model    = new _schema(_profiles).init(req, res, next);

    if( ! _model ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['profile model not found']}
        ));
    }

    _model.get({users: req.__user.id, qt: 'one'}, function(err, doc) {
        if( err || ! doc ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['profile not found']}
            ));
        }

        req.__profileData     = doc;
        req.__profileData._id = doc._id.toString();

        next();
    });

}

module.exports = function(app) {
    return UserProfile;
};