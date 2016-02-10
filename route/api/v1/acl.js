var async = require('async');
var _     = require('underscore');

module.exports = function(app) {

    var _mdl = app.middle;

    app.get('/api/resources',
        _mdl.api,
        _mdl.auth, 
    function(req, res, next) {

        app.acl.userRoles(req.__user.id, function(err, roles) {
            app.acl.whatResources(roles, function(err, resources) {
                res.json({roles: roles, data: resources});
            });
        });

    });

};