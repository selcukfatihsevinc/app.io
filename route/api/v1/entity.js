var async = require('async');
var dot   = require('dotty');
var _     = require('underscore');

module.exports = function(app) {

    var _mdl      = app.middle;
    var _schema   = app.lib.schema;
    var _helper   = app.lib.utils.helper;
    var _resp     = app.system.response.app;
    var _mongoose = app.core.mongo.mongoose;
    var _emitter  = app.lib.schemaEmitter;
    var _log      = app.lib.logger;
    var _group    = 'ROUTE:API:V1:ENTITY';
    
    var updateItem = function(Item, cond, update, id, name, type, value, field) {
        return function(cb) {
            Item.update(cond, update, {multi: false}, function(err, raw) {
                if(raw && raw.nModified) {
                    _log.info(_group+':EMITTED', name+type);
                    _emitter.emit(name+type, {id: id, value: value});
                }
                
                cb(null, {
                    field    : field,
                    type     : type,
                    value    : value,
                    affected : raw.nModified
                });
            });    
        }
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
            var field  = req.params.field;
            var object = req.params.object.toLowerCase().replace('.', '_');
            var name   = object+'_'+field+'_';
            var Item   = schema._model;
            var cond   = {_id: id};
            var update = {};
            var props  = dot.get(schema._save, 'properties.'+entity.short);
            var a      = [];

            /**
             * @TODO
             * each operator kullan
             */
            
            if(entity.type == 'array') {
                _.each(entity.setValArr, function(value, key) {
                    // add to set
                    update = {$addToSet: {}};
                    update.$addToSet[entity.short] = value;             
                    a.push(updateItem(Item, cond, _.clone(update), id, name, 'addtoset', value, field));

                    // remove from pair
                    if(entity.pair) {
                        update = {$pull: {}};
                        update.$pull[entity.pair] = value;
                        a.push(updateItem(Item, cond, _.clone(update), id, object+'_'+props.pair+'_', 'pull', value, props.pair));
                    }
                });
                
                async.parallel(a, function(err, results) {
                    _resp.OK(results, res);
                });
            }
            else {
                // set field value
                update = {$set: {}};
                update.$set[entity.short] = entity.setVal;
                
                // check owner
                if(props.owner)
                    cond[ schema._alias[props.owner] ] = req.__user.id;

                schema.validate(schema._update, update, function(err, valid) {
                    if(valid.error.length)
                        return schema.errors({name: 'ValidationError', errors: valid.error});

                    a.push(updateItem(Item, cond, update, id, name, 'set', entity.setVal, field));
                    
                    async.parallel(a, function(err, results) {
                        _resp.OK(results, res);
                    });
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
            var field  = req.params.field;
            var object = req.params.object.toLowerCase().replace('.', '_');
            var name   = object+'_'+field+'_';
            var Item   = schema._model;
            var cond   = {_id: id};
            var update = {};
            var props  = dot.get(schema._save, 'properties.'+entity.short);
            var a      = [];
            
            if(entity.type == 'array') {
                _.each(entity.setValArr, function(value, key) {
                    // pull from field
                    update = {$pull: {}};
                    update.$pull[entity.short] = value;
                    a.push(updateItem(Item, cond, update, id, name, 'pull', value, field));
                    
                    // pull from pair
                    if(entity.pair) {
                        update = {$pull: {}};
                        update.$pull[entity.pair] = value;
                        a.push(updateItem(Item, cond, update, id, object+'_'+props.pair+'_', 'pull', value, props.pair));
                    }
                });

                async.parallel(a, function(err, results) {
                    _resp.OK(results, res);
                });
            }
            else
                _resp.OK({}, res);
        }
    });
    
};