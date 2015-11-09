var dot = require('dotty');

function LibpostMiddleHelper(app) {
    this._app = app;
    this._env = app.get('env');
    this._log = app.lib.logger;

    return this;
}

module.exports = function(app) {
    return new LibpostMiddleHelper(app);
};
