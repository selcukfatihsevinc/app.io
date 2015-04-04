var EventEmitter = require('events').EventEmitter;

module.exports = function(app) {
    return new EventEmitter();
};