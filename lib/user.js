var async = require('async');
var dot   = require('dotty');
var _     = require('underscore');

function User(app) {
    this._app = app;
    this._mongoose = app.core.mongo.mongoose;
    this._log = app.system.logger;

    return this;
}

User.prototype.addRole = function(user) {
    if ( ! this._app.acl || ! user.ro.length )
        return this._log.info('app acl or user roles not found (User.addRole)');

    var Apps  = this._mongoose.model('System_Apps');
    var Roles = this._mongoose.model('System_Roles');
    var self  = this;

    var a = {
        roles: function(cb) {
            // rolleri alırken superadmin olmayanlar için işlem yapacağız
            Roles.find({_id: {$in: user.ro}, s: {$ne: 'superadmin'}}).exec(function(err, roles) {
                cb(err, roles);
            });
        }
    };

    async.parallel(a, function(err, results) {
        if(err)
            return self._log.error(err);

        if( ! results || ! results['roles'] || ! results['roles'].length )
            return self._log.info('roles not found (User.addRole)');

        var roleData = results['roles'];

        // collect app ids from role data
        var apps = [];
        _.each(roleData, function(value, key) {
            apps.push(value.ap.toString());
        });

        // get apps data
        Apps.find({_id: {$in: apps}}).exec(function(err, apps) {
            if( err || ! apps )
                return self._log.info('apps not found (User.addRole)');

            // use apps _id as key
            var appsObj = {};
            apps.forEach(function (doc) {
                appsObj[doc._id.toString()] = doc;
            });

            // acl'e parametre olarak role id yerine role slug vereceğiz
            // (node_acl'den sorgularken anlamlı olması için)
            var rolesObj = {};

            // use roles _id as key, appSlug_roleSlug as value
            _.each(roleData, function(value, key) {
                rolesObj[value._id.toString()] = appsObj[value.ap.toString()].s+'_'+value.s;
            });

            var _role_name = function(obj, rolesObj) {
                return _.map(obj, function(key) { return rolesObj[key]; });
            };

            // yeni kayıt durumunda rolleri ekliyoruz
            user.ro = _role_name(user.ro, rolesObj);

            if(user.ro) {
                self._app.acl.addUserRoles(user._id.toString(), user.ro);
                return self._log.info('[acl:addUserRoles] new user acl roles: '+user.ro);
            }
        });
    });

};

module.exports = function(app) {
    return User;
};
