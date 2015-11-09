var async   = require('async');
var request = require('request');

function r(asyncType, debug) {

    this.debug     = debug || false;
    this.asyncType = asyncType || 'parallel';
    this.requests  = {};
    var self       = this;

    var add = function(name, url, params, method, headers, auth) {
        try {
            method  = method || 'GET';
            params  = params || {};

            self.requests[name] = function(cb) {
                // timeout express'in default timeout'u ile aynı
                var reqParams = {
                    method  : method,
                    url     : url,
                    json    : true,
                    timeout : 30000,
                    pool    : {maxSockets: 1}
                };

                if(headers)
                    reqParams.headers = headers;

                if(auth)
                    reqParams.auth = auth;

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
                    err ? cb(err.code) : cb(null, {
                        body: res.body,
                        code: res.statusCode
                    });
                });
            };

            if(self.debug)
                console.log('current requests', self.requests);
        }
        catch(e) {
            console.log(e);
        }
    };

    this.post = function(name, url, params, headers, auth) {
        add(name, url, params, 'POST', headers, auth);
        return this;
    };

    this.get = function(name, url, params, headers, auth) {
        add(name, url, params, 'GET', headers, auth);
        return this;
    };

    this.put = function(name, url, params, headers, auth) {
        add(name, url, params, 'PUT', headers, auth);
        return this;
    };

    this.remove = function(name, url, params, headers, auth) {
        add(name, url, params, 'DELETE', headers, auth);
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