var async = require('async');
var _     = require('underscore');

module.exports = function(app) {

    /**
     * REST Routes
     */

    app.get('/api/v1/acl/resources', app.middle.auth, function(req, res, next) {
        res.apiResponse = true;

        app.acl.userRoles(req.user.id, function(err, roles) {
            app.acl.whatResources(roles, function(err, resources) {
                res.json({data: resources});
            });
        });

    });

};