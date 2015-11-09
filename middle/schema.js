var dot = require('dotty');
var _   = require('underscore');

function Schema(name) {
    
    return function(req, res, next) {
        var _app    = req.app;
        var _env    = _app.get('env');
        var _schema = _app.lib.schema;
        var _slug   = name.replace('.', '_');
            
        if( ! req.__m )
            req.__m = {};
        
        req.__m[_slug] = new _schema(name).init(req, res, next);
        
        next();
    }

}

module.exports = function(app) {
    return Schema;
};