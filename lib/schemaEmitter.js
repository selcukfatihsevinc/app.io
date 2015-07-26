var EventEmitter = require('events').EventEmitter;

module.exports = function(app) {

    var Emitter = new EventEmitter();

    // set max listeners
    Emitter.setMaxListeners(0);

    return Emitter;

};