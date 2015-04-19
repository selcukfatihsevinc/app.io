function Invite(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;

    new _schema('system.invites').init(req, res, next).get({invite_token: req.params.token, qt: 'one'}, function(err, doc) {
        if( ! doc ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['not found token']
            }));
        }

        var expires = doc.invite_expires.getTime();
        var now     = new Date().getTime();

        if(now > expires) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['expired token']
            }));
        }

        req.inviteData     = doc;
        req.inviteData._id = req.inviteData._id.toString();

        next();
    });

}

module.exports = function(app) {
    return Invite;
};