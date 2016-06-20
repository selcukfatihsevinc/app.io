var dot = require('dotty');
var _   = require('underscore');

function EntityCheck(req, res, next) {

    var _app      = req.app;
    var _env      = _app.get('env');
    var _resp     = _app.system.response.app;
    var _schema   = _app.lib.schema;
    var _helper   = _app.lib.utils.helper;
    var _mongoose = _app.core.mongo.mongoose;
    var _user     = req.__user;
    var _errType  = 'CounterApiError';
    var _middle   = 'middle.counter.check';

    // set schema
    var schema = new _schema(req.params.object).init(req, res, next);

    // get params
    var id    = req.params.id;
    var field = req.params.field;
    var type  = req.params.type || 'incr';
    var alias = Object.keys(schema._alias);

    // check field of schema
    if(alias.indexOf(field) == -1) {
        return next( _resp.NotFound({
            middleware: _middle,
            type: _errType,
            errors: ['field not found']
        }));
    }

    // get schema properties
    var short = schema._alias[field];
    var props = dot.get(schema._save, 'properties.'+short);
    var ftype = props.ftype;
    var mask  = schema._mask || {};
    var Item  = schema._model;

    // check masking
    if(_app.lib.utils) {
        var _maskName;
        if(type == 'incr')
            _maskName = 'increment';
        if(type == 'decr')
            _maskName = 'decrement';
        
        mask = mask[_maskName] || {};
        var mObj = {};
        mObj[field] = type;
        mObj = _helper.mask(mObj, mask);

        if( ! mObj ) {
            return next( _resp.UnprocessableEntity({
                middleware: _middle,
                type: _errType,
                errors: ['field mask is activated']
            }));
        }
    }

    // set counter object
    req.__counterAcl = {
        id    : id,
        field : field,
        type  : type,
        short : short
    };

    next(); 
}

module.exports = function(app) {
    return EntityCheck;
};