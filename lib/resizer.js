var fs = require('fs');
var gm = require('gm');

function Resizer() {

}

Resizer.prototype.resize = function(options , cb) {
    options = options || {};

    gm(options.path)
        .resize(options.width, options.height, '!')
        .quality(options.quality || 80)
        .write(options.target, function (err) {
            cb(err);
        });
};

Resizer.prototype.crop = function(options , cb) {
    options = options || {};

    gm(options.path)
        .crop(options.width, options.height)
        .quality(options.quality || 80)
        .write(options.target, function (err) {
            cb(err);
        });
};

Resizer.prototype.thumbnail = function(options , cb) {
    options = options || {};

    gm(options.path)
        .thumbnail(options.width, options.height)
        .quality(options.quality || 80)
        .write(options.target, function (err) {
            cb(err);
        });
};

module.exports = function(app) {
    return new Resizer();
};
