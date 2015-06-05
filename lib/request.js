var async   = require('async');
var request = require('request');

function r(asyncType, debug) {

    this.debug     = debug || false;
    this.asyncType = asyncType || 'parallel';
    this.requests  = {};
    var self       = this;

    var add = function(name, url, params, method, headers) {
        method  = method  || 'GET';
        headers = headers || {};
        params  = params  || {};

        self.requests[name] = function(cb) {
            // timeout express'in default timeout'u ile aynı
            var reqParams = {method: method, url: url, json: true, timeout: 120000, headers: headers, pool: false};

            switch(method) {
                case 'GET':
                    reqParams.qs = params;
                    break;
                case 'POST':
                default:
                    reqParams.form = params;
                    break;
            }

            request(reqParams, function(err, res, body) {
                err ? cb(err.code) : cb(null, res.body);
            });
        };

        if(self.debug)
            console.log('current requests', self.requests);
    };

    this.post = function(name, url, params, headers) {
        add(name, url, params, 'POST', headers);
        return this;
    };

    this.get = function(name, url, params, headers) {
        add(name, url, params, 'GET', headers);
        return this;
    };

    this.put = function(name, url, params, headers) {
        add(name, url, params, 'PUT', headers);
        return this;
    };

    this.remove = function(name, url, params, headers) {
        add(name, url, params, 'DELETE', headers);
        return this;
    };

    this.exec = function(callback) {
        async[this.asyncType](this.requests, callback);
    };

    return this;
}

module.exports = function(app) {
    return r;
};