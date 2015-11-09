var dot = require('dotty');
var _   = require('underscore');

function ObjectData(object, param) {

    return function(req, res, next) {
        var _app    = req.app;
        var _env    = _app.get('env');
        var _schema = _app.lib.schema;
        var _object = object.replace('.', '_');

        _object = req.__m[_object] || new _schema(object).init(req, res, next);

        _object.getById(dot.get(req, param), function(err, doc) {

            req.__object = doc;
            
            if(doc)
                req.__object._id = doc._id.toString();
            
            next();
            
        });
    }

}

module.exports = function(app) {
    return ObjectData;
};