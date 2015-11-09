var async = require('async');
var dot   = require('dotty');

module.exports = function(app) {

    var _mdl      = app.middle;
    var _schema   = app.lib.schema;
    var _helper   = app.lib.utils.helper;
    var _resp     = app.system.response.app;
    var _mongoose = app.core.mongo.mongoose;
    var _errType  = 'EntityApiError';
    
    var checkObject = function(schema, req, res, next, cb) {
        var user = req.__user;

        // check user id
        if( ! user || ! user.id || user.id == 'guest') {
            next( _resp.Forbidden() );
            return cb(true);
        }

        // get params
        var id       = req.params.id;
        var field    = req.params.field;
        var fieldVal = req.params.field_val;
        var alias    = Object.keys(schema._alias);
        
        // check field of schema
        if(alias.indexOf(field) == -1) {
            next( _resp.NotFound({type: _errType,
                errors: ['field not found']
            }));
            return cb(true);
        }

        if(fieldVal.indexOf('|') != -1)
            fieldVal = fieldVal.split('|');
        
        // get schema properties
        var short = schema._alias[field];
        var ref   = schema._refs[short];
        var slug  = req.__appData.slug;
        var props = dot.get(schema._save, 'properties.'+short);
        var type  = props.type;
        var pair  = props.pair;
        var flex  = props.flex_ref;
        var mask  = schema._mask || {};
        var Item  = schema._model;

        // check type
        if(type != 'array') {
            next( _resp.UnprocessableEntity({type: _errType,
                errors: ['field type is not array']
            }));
            return cb(true);
        }

        // set value
        var setVal;

        // eğer flexible reference ise user id veya profile id'ye zorlamıyoruz
        if(flex)
            setVal = fieldVal;
        if(ref == 'system_users')
            setVal = user.id;
        else if(ref == slug+'_profiles')
            setVal = user.profile;
        else 
            setVal = fieldVal;

        // setVal yoksa hata dönüyoruz
        if( ! setVal ) {
            next( _resp.NotFound({type: _errType,
                errors: ['field reference value not found']
            }));
            return cb(true);
        }

        // check masking
        if(app.lib.utils) {
            mask = mask['entity'] || {};
            var mObj = {};
            mObj[field] = setVal;
            mObj = _helper.mask(mObj, mask);
            
            if( ! mObj ) {
                next( _resp.UnprocessableEntity({type: _errType,
                    errors: ['field mask is activated']
                }));
                return cb(true);
            }
        }

        var returnObj = {
            setVal : setVal,
            short  : short,
            pair   : schema._alias[pair]
        };
        
        // get object
        Item.findOne({_id: id}, function (err, doc) {
            if( err || ! doc ) {
                next( _resp.NotFound({type: _errType,
                    errors: ['object not found']
                }));
                return cb(true);
            }

            // set doc original
            doc._original = doc.toJSON();
            returnObj.doc = doc;
            
            // check valid 
            if(ref && fieldVal) {
                var i = (_helper.type(fieldVal) == '[object Array]') ? fieldVal : [fieldVal];

                _mongoose.model(props.ref).count({_id: {$in: i}}, function(err, count) {
                    if( err || count != i.length ) {
                        next( _resp.NotFound({type: _errType,
                            errors: ['non existing field reference']
                        }));
                        return cb(true);
                    }

                    cb(null, returnObj);
                });
            }
            else 
                cb(null, returnObj);
        });
    };

    /**
     * ----------------------------------------------------------------
     * Add User to Set (add to field, remove from pair)
     * ----------------------------------------------------------------
     */
    
    app.put('/entity/:object/:id/:field/:field_val?',
        _mdl.api,
        _mdl.client,
        _mdl.appdata,
        _mdl.auth,
        _mdl.acl,
    function(req, res, next) {
        var schema = new _schema(req.params.object).init(req, res, next);

        if(schema) {
            checkObject(schema, req, res, next, function(err, result) {
                if(err)
                    return;
                
                var id     = req.params.id;
                var Item   = schema._model;
                var update = {$addToSet: {}};
                
                // add to set
                update.$addToSet[result.short] = result.setVal;
                
                // remove from pair
                if(result.pair) {
                    update.$pull = {};
                    update.$pull[result.pair] = result.setVal;
                }
                
                Item.update({_id: id}, update, {multi: false}, function(err, raw) {
                    if( ! raw.nModified )
                        return _resp.OK({affected: 0}, res);

                    Item.findOne({_id: id}, function (err, doc) {
                        /**
                         * 
                         * checkObject içinde doc'u aldıktan sonra Item.update çalıştırdığımız için doc ve _original değişmiyor aynı kalıyor
                         * post save hook'taki count'ların çalışması için _original'a ihtiyaç var
                         * bu yüzden bir kere daha çekip _original'i yeni doc'a set ediyoruz ve öyle kaydediyoruz
                         */

                        doc._original = result.doc._original;
                        doc.save(function(err) {
                            if(err)
                                return next( _resp.InternalServerError(err) );

                            _resp.OK({affected: 1}, res);                            
                        });
                    });
                });
            });
        }
    });

    /**
     * ----------------------------------------------------------------
     * Neutralize Action (remove from field and pair)
     * ----------------------------------------------------------------
     */
    
    app.delete('/entity/:object/:id/:field/:field_val?',
        _mdl.api,
        _mdl.client,
        _mdl.appdata,
        _mdl.auth,
        _mdl.acl,
        function(req, res, next) {
            var schema = new _schema(req.params.object).init(req, res, next);

            if(schema) {
                checkObject(schema, req, res, next, function(err, result) {
                    if(err)
                        return;

                    var id     = req.params.id;
                    var Item   = schema._model;
                    var update = {$pull: {}};

                    // pull from field
                    update.$pull[result.short] = result.setVal;
                    
                    // pull from pair
                    if(result.pair)
                        update.$pull[result.pair] = result.setVal;

                    Item.update({_id: id}, update, {multi: false}, function(err, raw) {
                        if( ! raw.nModified )
                            return _resp.OK({affected: 0}, res);

                        Item.findOne({_id: id}, function (err, doc) {
                            doc._original = result.doc._original;
                            doc.save(function(err) {
                                if(err)
                                    return next( _resp.InternalServerError(err) );

                                _resp.NoContent(null, res);
                            });
                        });
                    });
                });
            }
        });
    
};