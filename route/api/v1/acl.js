var async = require('async');
var _     = require('underscore');

module.exports = function(app) {

    var _mdl = app.middle;

    app.get('/api/resources', _mdl.auth, function(req, res, next) {
        res.apiResponse = true;

        app.acl.userRoles(req.user.id, function(err, roles) {
            app.acl.whatResources(roles, function(err, resources) {
                res.json({data: resources});
            });
        });

    });

};