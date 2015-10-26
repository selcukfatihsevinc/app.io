var crypto = require('crypto');
var jwt    = require('jwt-simple');
var _      = require('underscore');

// speed up calls
var toString = Object.prototype.toString;

function Helper(app) {
    this._app = app;

    // slugs for validation messages
    this._slugs = {
        required: 'required_error'
    }
}

Helper.prototype.type = function (value) {
    return toString.call(value);
}

Helper.prototype.hash = function (passwd, salt) {
    return crypto.createHmac('sha256', salt).update(passwd).digest('hex');
}

Helper.prototype.random = function (len) {
    return crypto.randomBytes(Math.ceil(len/2))
        .toString('hex') // convert to hexadecimal format
        .slice(0, len); // return required number of characters
}

Helper.prototype.clone = function (obj) {
    return JSON.parse(JSON.stringify(obj));
}

Helper.prototype.mapToString = function (value) {
    return _.map(value, function(obj) { return obj.toString(); });
}

Helper.prototype.expiresIn = function (numDays) {
    var date = new Date();
    return date.setDate(date.getDate()+numDays);
}

Helper.prototype.genToken = function (user, secret, days) {
    var expires = this.expiresIn(days);
    var token   = jwt.encode({exp: expires, user: user}, secret);

    return {
        token: token,
        expires: expires
    };
}

Helper.prototype.bodyErrors = function (errors, next) {
    var self   = this;
    this._http = this._app.system.response ? this._app.system.response.app : false;

    var resp = {
        type: 'ValidationError',
        errors: []
    };

    _.each(errors, function(value, key) {
        if(self.type(value == '[object Array]')) {
            _.each(value, function(v, k) {
                resp.errors.push({path: key, slug: v});
            });
        }
        else
            resp.errors.push({path: key, slug: value});
    });

    return (next && this._http) ? next(this._http.UnprocessableEntity(resp)) : resp.errors;
}

module.exports = function(app) {
    return new Helper(app);
};
