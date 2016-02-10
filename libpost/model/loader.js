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

        var alias = {};
        if(options.ArrayOfObjects)
            alias = options.ArrayOfObjects;
        
        // create inspector
        var Inspector    = new this._inspector(schema, alias).init();
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
        // this.hooks(Schema, lower);
        
        return Schema;        
    }
    catch(e) {
        self._log.error(group, e.stack);
    }
};

LibpostModelLoader.prototype.hooks = function(schema, lower) {
    var self = this;
    
    schema.post('save', function (doc) {
        if(this._isNew)
            self._emitter.emit(lower+'_saved', doc);
    });

    schema.post('remove', function (doc) {
        self._emitter.emit(lower+'_removed', doc);
    });    
}

LibpostModelLoader.prototype.listener = function(options) {
    var self     = this;
    var Name     = options.Name;
    var Denorm   = options.Denorm;
    var Size     = options.Size; 
    var Count    = options.Count;
    var CountRef = options.CountRef;
    var Hook     = options.Hook;
    
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

    if(CountRef) {
        _.each(CountRef, function (target, source) {
            self.countRef(Name, target, source);
        });
    }

    if(Hook) {
        _.each(Hook, function (hookData, hookName) {
            _.each(hookData, function(data, action) {
                _.each(data, function(target, source) {
                    self['hook_'+action](Name, source, target); 
                });
            });
        });
    }
};

LibpostModelLoader.prototype.hook_push = function(name, source, target) {
    /**
     * @TODO
     * implement hook
     */
    return true;
    
    var self  = this;
    var lower = name.toLowerCase();
    var Save  = self._schemaInspector.Save.properties;
    var Alias = self._schemaInspector.Alias;
    target    = target.split(':');
    var ref   = dot.get(Save, Alias[target[0]]+'.ref');

    if( ! ref )
        return this._log.error('LIBPOST:MODEL:LOADER:HOOK_PUSH', 'reference not found');
    
    var Model = this._mongoose.model(ref);
    
    // push each ile target modele push et
    this._emitter.on(lower+'_saved', function(data) {
        // set update
        var update = {$push: {}};
        update.$push[target[1]] = data;

        Model.update(cond, update, opts, function(err, raw) {
            if(err)
                self._log.error('LIBPOST:MODEL:LOADER:INCR', err);
        });
    });
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

LibpostModelLoader.prototype.countRef = function(name, target, source) {
    var self  = this;
    var lower = name.toLowerCase();
    var Save  = self._schemaInspector.Save.properties;
    var Alias = self._schemaInspector.Alias;
    var ref   = dot.get(Save, Alias[source]+'.ref');

    if( ! ref )
        return this._log.error('LIBPOST:MODEL:LOADER:COUNT_REF', 'reference not found');

    this._emitter.on(lower+'_saved', function(data) {
        self._incr(ref, target, data[Alias[source]]);
    });

    this._emitter.on(lower+'_removed', function(data) {
        self._decr(ref, target, data[Alias[source]]);
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
