var Promise = require('bluebird');
var dot     = require('dotty');

function Cache(app) {
    this._app   = app;
    this._env   = app.get('env');
    this._log   = app.lib.logger;
    this._group = 'APP:LIB:CACHE';
    
    return this;
}

Cache.prototype.getPromise = function () {
    var args   = [].slice.call(arguments, 0); // arguments'i diziye çevir
    var myObj  = args[0]; // main object
    var myFunc = args[1]; // function 
    
    // get parameters
    args.splice(0, 2);
    var myParams = args;

    // cache hit
    myObj.hit = true;

    return new Promise(function(resolve, reject) {
        // add callback to parameters
        myParams.push(function(err, value) {
            err ? reject(err) : resolve(value);     
        });

        // apply function
        myFunc.apply(myObj, myParams);
    });
};

// parameters = array
Cache.prototype.run = function(myObj, myFunc, parameters, opts, cb) {
    var self     = this;
    myObj        = myObj || {};
    opts         = opts || {};
    parameters   = parameters || [];
    var cacheKey = opts.cacheKey;

    // prepend function as parameter
    parameters.unshift(myFunc);

    // prepend main object as parameter
    parameters.unshift(myObj);
    
    // core cache ve cache key varsa cache'i çalıştırıyoruz
    if(this._app.core.cache && cacheKey) {
        // objeyi, fonksiyonu vs. cache-stampede içinde kullanılabilmesi için parametre olarak geçiriyoruz
        var params = {params: parameters};
        if(opts.expiry) // in ms
            params.expiry = opts.expiry;

        this._app.core.cache.cached('cache:'+cacheKey, this.getPromise, params)
            .then(function(doc) {
                cb(null, doc);
            }, function(err) {
                self._log.error(self._group, err);
                cb(err);
            });
    }
};

Cache.prototype.async = function(myObj, myFunc, parameters, opts, errNull) {
    var self = this;
    
    return function(cb) {
        self.run(myObj, myFunc, parameters, opts, function(err, doc) {
            cb(errNull ? null : err, doc);
        });    
    }    
};

module.exports = function(app) {
    return Cache;
};
