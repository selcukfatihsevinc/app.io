var extend = require('extend');
var dot    = require('dotty');

function Async(app) {
    this._app = app;
    this._env = app.get('env');
    this._log = app.lib.logger;

    return this;
}

Async.prototype.aclResources = function(userId) {
    var self = this;

    return function(cb) {
        self._app.acl.userRoles(userId, function(err, roles) {
            self._app.acl.whatResources(roles, function(err, resources) {
                cb(null, {roles: roles, resources: resources});
            });
        });
    }
};

module.exports = function(app) {
    return new Async(app);
};
