var Purest = require('purest');

function Facebook(opts) {
    this._opts = opts || {};
    this._opts.provider = 'facebook';
    this._purest = new Purest(this._opts);
    this._group = 'LIB:SOCIAL:FACEBOOK';

    return this;
}

Facebook.prototype.user = function (cb) {
    var self = this;

    this._purest.query()
        .get('me')
        .auth(this._opts.auth.token)
        .request(function (err, res, body) {
            if (err) {
                console.log(err);
                return cb(err);
            }

            cb(null, body);
        });
};

Facebook.prototype.post = function (endpoint, form, cb) {
    // form = {message: 'post message'}

    this._purest.query()
        .post(endpoint || 'me/feed')
        .auth(this._opts.auth.token)
        .form(form)
        .request(function (err, res, body) {
            if (err) {
                console.log(err);
                return cb(err);
            }

            cb(null, body);
        });
};

module.exports = function(app) {
    return Facebook;
};

