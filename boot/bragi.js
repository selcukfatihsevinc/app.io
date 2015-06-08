var logger = require('bragi');

module.exports = function(app) {

    try {
        return logger;
    }
    catch(e) {
        console.log(e.stack);
        return false;
    }

};




