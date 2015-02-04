var dot = require('dotty');

function BootConf(app, name) {
    var _env  = app.get('env');
    var _name = app.get('name');
    var _appC = dot.get(app.config, [_env, _name, 'boot', name].join('.'));
    var _defC = dot.get(app.config, [_env, 'boot', name].join('.'));

    return _appC || _defC;
}

module.exports = function(app) {
    return BootConf;
};
