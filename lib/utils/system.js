var _ = require('underscore');

// speed up calls
var toString = Object.prototype.toString;

function System(app) {
    this._app = app;
}

System.prototype.hash = function (passwd, salt) {

}

module.exports = function(app) {
    return new System(app);
};
