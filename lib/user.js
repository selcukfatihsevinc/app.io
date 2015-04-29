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
        return _log.info('app acl or user roles not found (User.addRole)');

    var Apps  = this._mongoose.model('System_Apps');
    var Roles = this._mongoose.model('System_Roles');
    var self  = this;
    var a     = {};

    // app data'sını alıyoruz
    a['app'] = function(cb) {
        Apps.findById(user.ap, function (err, apps) {
            cb(err, apps);
        });
    };

    a['roles'] = function(cb) {
        // rolleri alırken superadmin olmayanlar için işlem yapacağız
        // kullanıcı app id'si ile aynı olan roller üzerinde işlem yapıyoruz
        Roles.find({_id: {$in: user.ro}, s: {$ne: 'superadmin'}, ap: user.ap}).exec(function(err, roles) {
            cb(err, roles);
        });
    };

    async.parallel(a, function(err, results) {
        if(err)
            return self._log.error(err);

        if( ! results || ! results['app'] || ! results['roles'] || ! results['roles'].length )
            return self._log.info('app or roles not found (User.addRole)');

        var appData  = results['app'];
        var roleData = results['roles'];

        // acl'e parametre olarak role id yerine role slug vereceğiz
        // (node_acl'den sorgularken anlamlı olması için)
        var rolesObj = {};

        _.each(roleData, function(value, key) {
            rolesObj[value._id.toString()] = appData.s+'_'+value.s;
        });

        var _role_name = function(obj) {
            return _.map(obj, function(key) { return rolesObj[key]; });
        };

        // yeni kayıt durumunda rolleri ekliyoruz
        user.ro = _role_name(user.ro);

        if(user.ro) {
            self._app.acl.addUserRoles(user._id.toString(), user.ro);
            return self._log.info('[acl:addUserRoles] new user acl roles: '+user.ro);
        }
    });

};

module.exports = function(app) {
    return User;
};
