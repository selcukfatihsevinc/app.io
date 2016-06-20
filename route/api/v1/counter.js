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
    var _group    = 'ROUTE:API:V1:COUNTER';
    
    /**
     * ----------------------------------------------------------------
     * Counter
     * ----------------------------------------------------------------
     */

    app.put('/counter/:object/:id/:field/:type(incr|decr)?',
        _mdl.api,
        _mdl.client,
        _mdl.appdata,
        _mdl.auth,
        _mdl.acl,
        _mdl.counter.check,
    function(req, res, next) {
        var schema = new _schema(req.params.object).init(req, res, next);

        if(schema) {
            var counter = req.__counterAcl;
            var Item    = schema._model;
            var cond    = {_id: counter.id};
            var update  = {$inc: {}};

            if(counter.type == 'incr')
                update.$inc[counter.short] = 1;
            if(counter.type == 'decr')
                update.$inc[counter.short] = -1;

            Item.update(cond, update, {multi: false}, function(err, raw) {
                _resp.OK({
                    field    : counter.field,
                    type     : counter.type,
                    affected : raw.nModified                    
                }, res);
            });
        }
    });

};