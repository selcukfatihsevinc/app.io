var stampede = require('cache-stampede');

module.exports = function(app) {

    return stampede.redis(app.core.redis.a);

};