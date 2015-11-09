var async = require('async');
var dot   = require('dotty');
var _     = require('underscore');

function AsyncList(params, req, res, next) {
    this._params = params || {};
    this._req    = req;
    this._res    = res;
    this._next   = next;
    this._a      = {};
    this._schema = req.app.lib.schema;

    return this;
}

AsyncList.prototype.execParams = function(opts) {
    var self  = this;
    var error = opts.err || false;

    return function(cb) {
        new self._schema(opts.schema).init(self._req, self._res, self._next)[opts.method || 'get'](opts.params, function(err, doc) {
            cb(error ? err : null, doc);
        });
    };
};

AsyncList.prototype.execAsync = function(cb) {
    var self = this;

    _.each(this._params, function(value, key) {
        self._a[key] = self.execParams(value);
    });

    async.parallel(self._a, function(err, results) {
        cb(err, results);
    });

};

module.exports = function(app) {
    return AsyncList;
};
