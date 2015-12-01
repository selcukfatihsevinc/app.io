var extend = require('extend');
var dot    = require('dotty');
var _      = require('underscore');

function LibpostModelLoader(app) {
    var self  = this;
    var group = 'MODEL:LOADER';
    
    try {
        this._app = app;
        this._env = app.get('env');
        this._log = app.lib.logger;
        this._inspector = app.lib.inspector;
        this._mongo = app.core.mongo;
        this._mongoose = app.core.mongo.mongoose;
        this._worker = parseInt(process.env.worker_id);
        this._syncConf = app.config[this._env].sync;
        this._emitter = app.lib.schemaEmitter;
    }
    catch(e) {
        self._log.error(group, e.stack);
    }
    
    return this;
}

LibpostModelLoader.prototype.mongoose = function(schema, options) {
    var self  = this;
    var group = 'MODEL:'+options.Name;
    
    try {
        var lower = options.Name.toLowerCase();

        // create schema
        var Schema = this._mongo.db.Schema(schema);

        // create inspector
        var Inspector    = new this._inspector(schema).init();
        Schema.inspector = Inspector;
        // Schema.structure = schema;

        // extend inspector with options
        extend(Schema.inspector, options);

        // allow superadmin (mongoose connection bekliyor)
        if(this._worker == 0 && dot.get(this._syncConf, 'data.superacl')) {
            this._mongoose.connection.on('open', function() {
                if(self._app.acl) {
                    self._app.acl.allow('superadmin', lower, '*');
                    self._log.info(group+':ACL:ALLOW', 'superadmin:'+lower+':*', 'gray');
                }
            });
        }

        if(this._worker == 0 && dot.get(this._syncConf, 'denormalize.'+lower)) {
            setTimeout(function() {
                self._app.lib.denormalize.sync(options.Name, self._app.boot.kue);
            }, 10000);
        }

        // set schema inspector
        this._schemaInspector = Schema.inspector;
        
        // init listeners
        this.listener(options);
        
        return Schema;        
    }
    catch(e) {
        self._log.error(group, e.stack);
    }
};

LibpostModelLoader.prototype.listener = function(options) {
    var self   = this;
    var Name   = options.Name;
    var Denorm = options.Denorm;
    var Size   = options.Size; 
    var Count  = options.Count;
    
    if(Denorm) {
        _.each(Denorm, function (value, key) {
            self.denorm(key.toLowerCase()+'_updated', self._schemaInspector);
        });
    }
    
    if(Size) {
        _.each(Size, function (target, source) {
            self.size(Name, source, target);
        });        
    }

    if(Count) {
        _.each(Count, function (target, source) {
            self.count(Name, target, source);
        });
    }
};

LibpostModelLoader.prototype.denorm = function(listener, inspector) {
    var self = this;
    
    this._emitter.on(listener, function(data) {
        self._log.info('MODEL:LOADER:DENORM:'+listener, data);
        self._app.lib.denormalize.touch(data, inspector);
    });
};


LibpostModelLoader.prototype.size = function(name, source, target) {
    var self  = this;
    var lower = name.toLowerCase();
    
    this._emitter.on(lower+'_'+source+'_addtoset', function(data) {
        self._incr(name, target, data.id);
    });
    
    this._emitter.on(lower+'_'+source+'_pull', function(data) {
        self._decr(name, target, data.id);
    });
};

LibpostModelLoader.prototype.count = function(name, target, source) {
    var self  = this;
    var lower = name.toLowerCase();
    var Save  = self._schemaInspector.Save.properties;
    var Alias = self._schemaInspector.Alias;
    var ref   = dot.get(Save, Alias[source]+'.ref');

    if( ! ref )
        return this._log.error('LIBPOST:MODEL:LOADER:COUNT', 'reference not found');
    
    this._emitter.on(lower+'_'+source+'_addtoset', function(data) {
        self._incr(ref, target, data.value);
    });

    this._emitter.on(lower+'_'+source+'_pull', function(data) {
        self._decr(ref, target, data.value);
    });
};

LibpostModelLoader.prototype._incr = function(model, field, id, num, decr) {
    num        = Math.abs(parseInt(num || 1));
    var self   = this;
    var Model  = this._mongoose.model(model);
    var cond   = {};
    var update = {$inc: {}};
    var opts   = {multi: true};
    var Alias  = dot.get(Model.schema, 'inspector.Alias');

    if(Alias && Alias[field])
        field = Alias[field];

    if(id) {
        cond = {_id: id};
        opts = {multi: false};
    }

    if(decr)
        num *= -1;

    // set update
    update.$inc[field] = num;

    Model.update(cond, update, opts, function(err, raw) {
        if(err)
            self._log.error('LIBPOST:MODEL:LOADER:INCR', err);
    });
};

LibpostModelLoader.prototype._decr = function(model, field, id, num) {
    this._incr(model, field, id, num, true);
};

module.exports = function(app) {
    return new LibpostModelLoader(app);
};
