var async = require('async');
var php   = require('phpjs');
var _     = require('underscore');
var s     = require('underscore.string');

function AppUser(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;

    if( ! req.__appId ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['app id not found']}
        ));
    }

    var _profiles = req.__appData.slug+'.profiles';
    var _email    = req.body.email;
    var _username = req.body.username;
    var _login    = _email || _username;

    if( ! _login || _login == '' ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['user credentials not found']}
        ));
    }

    // async object
    var a = {};

    if(_email) {
        a.email = function(cb) {
            new _schema('system.users').init(req, res, next).get({
                email: _email.toLowerCase(),
                qt: 'one'
            }, function(err, doc) {
                cb(err, doc);
            });
        }
    }
    else if(_username) {
        a.username = function(cb) {
            var model = new _schema(_profiles).init(req, res, next);

            if( ! model )
                return cb(true);

            model.get({
                username_lc: _username.toLowerCase(),
                qt: 'one'
            }, function(err, doc) {
                var userId = doc.users;

                new _schema('system.users').init(req, res, next).getById(userId, function(err, doc) {
                    cb(err, doc);
                })
            });
        }
    }

    async.parallel(a, function(err, results) {

        if( ! results.email && ! results.username ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['user not found']}
            ));
        }

        req.__userData     = results.email || results.username;
        req.__userData._id = req.__userData._id.toString();

        next();
    });

}

module.exports = function(app) {
    return AppUser;
};