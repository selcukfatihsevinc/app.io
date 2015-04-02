var Purest = require('purest');

function Twitter(opts) {
    this._opts = opts || {};
    this._opts.provider = 'twitter';
    this._purest = new Purest(this._opts);

    return this;
}

Twitter.prototype.user = function (cb) {

};

Twitter.prototype.post = function (form, cb) {
    // form = {status: 'status message'}

    this._purest.post('statuses/update', {
        oauth:{
            consumer_key: this._opts.auth.key,
            consumer_secret: this._opts.auth.secret,
            token: this._opts.auth.token,
            token_secret: this._opts.auth.token_secret
        },
        form: form
    },
    function (err, res, body) {
        if (err)
            return cb(err);

        cb(null, body);
    })

};

module.exports = function(app) {
    return Twitter;
};

