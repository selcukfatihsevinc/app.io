var async = require('async');
var dot   = require('dotty');
var _     = require('underscore');

function LibpostAuth(app) {
    this._app       = app;
    this._env       = app.get('env');
    this._conf      = app.config[this._env].api;
    this._log       = app.lib.logger;
    this._async     = app.lib.async;
    this._schema    = app.lib.schema;
    this._helper    = app.lib.utils.helper;
    this._mailer    = app.lib.mailer;

    return this;
}

LibpostAuth.prototype.userProfile = function(userId, appSlug, cb) {
    var self = this;

    var a = {
        resources: self._async.aclResources(userId)
    };

    // get user profile
    if(dot.get(self._app.model, appSlug+'.profiles')) {
        a.profile = function(cb) {
            new self._schema(appSlug+'.profiles').init(self._app).get({users: userId, qt: 'one'}, function(err, doc) {
                cb(null, doc);
            });
        }
    }

    async.parallel(a, function(err, results) {
        cb(err, results);
    });
};

LibpostAuth.prototype.userData = function(userData, appSlug, res) {
    var self   = this;
    var userId = userData._id;
    var tConf  = self._conf.token;
    var _resp  = self._app.system.response.app;

    this.userProfile(userId, appSlug, function(err, results) {
        var data = {_id: userId};

        if(results.profile)
            data.profile = results.profile._id.toString();

        var token = self._helper.genToken(data, tConf.secret, tConf.expires);

        token.userId    = userId;
        token.roles     = results.resources.roles || {};
        token.resources = results.resources.resources || {};
        token.profile   = false;

        if(results.profile)
            token.profile = results.profile;

        if(userData.last_login)
            token.lastLogin = userData.last_login;

        _resp.OK(token, res);

        // update last login
        new self._schema('system.users').init(self._app).put(userId, {last_login: Date.now()}, function(err, affected) {});
    });
};

LibpostAuth.prototype.emailTemplate = function(name, appSlug, token, toEmail, group, cb) {
    var self  = this;
    var mConf = dot.get(self._app.config[self._env], 'app.mail.'+appSlug);

    /**
     * @TODO
     * callback ile hataları dön
     */
        
    // set transport
    var _transport = self._app.boot.mailer;

    if(mConf) {
        var mailObj = _.clone(mConf[name]) || {};

        self._app.render(appSlug+'/email/templates/'+name, {
            baseUrl  : mConf.baseUrl,
            endpoint : mConf.endpoints[name],
            token    : token
        }, function(err, html) {
            if(err)
                self._log.error(group, err);

            if(html) {
                mailObj.to   = toEmail;
                mailObj.html = html;

                self._log.info(group+':MAIL_OBJ', mailObj);

                new self._mailer(_transport).send(mailObj);
            }
        });
    }
    else
        self._log.info(group+':MAIL_OBJ', 'not found');

    cb();
};

LibpostAuth.prototype.userAcl = function(userId, objects, cb) {
    if(this._helper.type(objects) != '[object Array]')
        objects = [objects];
    
    _.each(objects, function(value, key) {
        objects[key] = value.replace('.', '_');
    });
    
    this._app.acl.allowedPermissions(userId, objects, function(err, results) {
        cb(err, results);
    });
};

module.exports = function(app) {
    return new LibpostAuth(app);
};
