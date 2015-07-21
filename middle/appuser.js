var async = require('async');
var php   = require('phpjs');
var _     = require('underscore');
var s     = require('underscore.string');

function AppUser(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;

    if( ! req.appId ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['app id not found']}
        ));
    }

    var login_field = req.body.email || req.body.username;

    if( ! login_field ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['user credentials not found']}
        ));
    }

    var a = {
        app: function(cb) {
            new _schema('system.apps').init(req, res, next).getById(req.appId, function(err, doc) {
                cb(err, doc);
            });
        },
        user: function(cb) {
            var obj = {
                apps: req.appId,
                qt: 'one'
            };

            /**
             * @TODO
             * email hep küçük harfle kaydedilecek (register vs ekle)
             * kullanıcı adının da lower versiyonu modelde tutulacak (unique olabilmesi için)
             */

            if(req.body.email)
                obj.email = req.body.email.toLowerCase();
            else if(req.body.username)
                obj.username = req.body.username;

            new _schema('system.users').init(req, res, next).get(obj, function(err, doc) {
                cb(err, doc);
            });
        }
    };

    async.parallel(a, function(err, results) {

        if( ! results.user ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['user not found']}
            ));
        }

        req.appData      = results.app;
        req.userData     = results.user;
        req.userData._id = req.userData._id.toString();

        next();
    });

}

module.exports = function(app) {
    return AppUser;
};