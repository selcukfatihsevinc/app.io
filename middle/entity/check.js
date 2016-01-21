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
    var _errType  = 'EntityApiError';
    var _middle   = 'middle.entity.check';
    
    // check user id
    if( ! _user || ! _user.id || _user.id == 'guest')
        return next( _resp.Forbidden() );

    // set schema
    var schema = new _schema(req.params.object).init(req, res, next);
    
    // get params
    var id       = req.params.id;
    var field    = req.params.field;
    var fieldVal = req.params.field_val;
    var alias    = Object.keys(schema._alias);

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
    var ref   = schema._refs[short];
    var slug  = req.__appData.slug;
    var props = dot.get(schema._save, 'properties.'+short);
    var type  = props.type;
    var pair  = props.pair;
    var flex  = props.flex_ref;
    var acl   = props.entity_acl;
    var mask  = schema._mask || {};
    var Item  = schema._model;

    // pair'i varsa tekli item üzerinde işlem yapıyoruz
    if(fieldVal && fieldVal.indexOf('|') != -1 && type == 'array' && ! pair)
        fieldVal = fieldVal.split('|');
    
    // set value
    var setVal;

    // eğer flexible reference ise user id veya profile id'ye zorlamıyoruz
    if(flex)
        setVal = fieldVal;
    if(ref == 'system_users')
        setVal = _user.id;
    else if(ref == slug+'_profiles')
        setVal = _user.profile;
    else
        setVal = fieldVal;

    // eğer setVal yoksa hata dönüyoruz
    if( ! setVal ) {
        return next( _resp.NotFound({
            middleware: _middle,
            type: _errType,
            errors: ['field reference value not found']
        }));
    }

    // check masking
    if(_app.lib.utils) {
        mask = mask['entity'] || {};
        var mObj = {};
        mObj[field] = setVal;
        mObj = _helper.mask(mObj, mask);

        if( ! mObj ) {
            return next( _resp.UnprocessableEntity({
                middleware: _middle,
                type: _errType,
                errors: ['field mask is activated']
            }));
        }
    }

    var setValArr = _.uniq( (_helper.type(setVal) == '[object Array]') ? setVal : [setVal] );
    
    // set entity object
    req.__entityAcl = {
        id        : id,
        type      : type,
        setVal    : setVal,
        setValArr : setValArr,
        short     : short,
        acl       : acl,
        pair      : schema._alias[pair],
        actor     : _user
    };

    // check valid
    if(ref && fieldVal) {
        _mongoose.model(props.ref).count({_id: {$in: setValArr}}, function(err, count) {
            if( err || count != setValArr.length ) {
                return next( _resp.NotFound({
                    middleware: _middle,
                    type: _errType,
                    errors: ['non existing field reference']
                }));
            }

            /**
             * @TODO
             *
             * reference owner'lığı da set edilebilsin, örneğin comment eklendi ve modele comment array'i basılacak,
             * burada count yerine owner id ile birlikte data alınabilir
             */

            next();
        });
    }
    else
        next();
}

module.exports = function(app) {
    return EntityCheck;
};