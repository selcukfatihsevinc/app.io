var async = require('async');
var dot   = require('dotty');

module.exports = function(app) {

    var _mdl      = app.middle;
    var _schema   = app.lib.schema;
    var _helper   = app.lib.utils.helper;
    var _resp     = app.system.response.app;
    var _mongoose = app.core.mongo.mongoose;

    var updateItem = function(Item, cond, update, id, original, res, next) {
        
        Item.update(cond, update, {multi: false}, function(err, raw) {
            if( ! raw.nModified )
                return _resp.OK({affected: 0}, res);

            Item.findOne({_id: id}, function (err, doc) {
                /**
                 *
                 * checkObject içinde doc'u aldıktan sonra Item.update çalıştırdığımız için doc ve _original değişmiyor aynı kalıyor
                 * post save hook'taki count'ların çalışması için _original'a ihtiyaç var
                 * bu yüzden bir kere daha çekip _original'i yeni doc'a set ediyoruz ve öyle kaydediyoruz
                 */

                doc._original = original;
                doc.save(function(err) {
                    if(err)
                        return next( _resp.InternalServerError(err) );

                    _resp.OK({affected: 1}, res);
                });
            });
        });
        
    }
    
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
        _mdl.entity.check,
        _mdl.entity.middleware,
    function(req, res, next) {
        var schema = new _schema(req.params.object).init(req, res, next);

        if(schema) {
            var entity = req.__entityAcl;
            var id     = req.params.id;
            var Item   = schema._model;
            var cond   = {_id: id};
            var update = {};
            var props  = dot.get(schema._save, 'properties.'+entity.short);
            
            if(entity.type == 'array') {
                update = {$addToSet: {}};

                // add to set
                update.$addToSet[entity.short] = entity.setVal;

                // remove from pair
                if(entity.pair) {
                    update.$pull = {};
                    update.$pull[entity.pair] = entity.setVal;
                }

                updateItem(Item, cond, update, id, entity.doc._original, res, next);
            }
            else {
                update = {$set: {}};
                
                // set field value
                update.$set[entity.short] = entity.setVal;
                
                // check owner
                if(props.owner)
                    cond[ schema._alias[props.owner] ] = req.__user.id;

                schema.validate(schema._update, update, function(err, valid) {
                    if(valid.error.length)
                        return schema.errors({name: 'ValidationError', errors: valid.error});

                    updateItem(Item, cond, update, id, entity.doc._original, res, next);
                });
            }
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
        // _mdl.acl, DELETE isteği gelmesi için acl'de delete izni vermek gerekiyor, delete izni vermeden bu endpoint'in çalışması lazım  
        _mdl.entity.check,
        _mdl.entity.middleware,
    function(req, res, next) {
        var schema = new _schema(req.params.object).init(req, res, next);

        if(schema) {
            var entity = req.__entityAcl;
            var id     = req.params.id;
            var Item   = schema._model;
            var cond   = {_id: id};
            var update = {};
            
            if(entity.type == 'array') {
                update = {$pull: {}};

                // pull from field
                update.$pull[entity.short] = entity.setVal;

                // pull from pair
                if(entity.pair)
                    update.$pull[entity.pair] = entity.setVal;                        
            }

            updateItem(Item, cond, update, id, entity.doc._original, res, next);
        }
    });
    
};