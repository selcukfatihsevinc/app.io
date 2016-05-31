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
        this._denormalize = app.lib.denormalize;
    }
    catch(e) {
        self._log.error(group, e.stack);
    }
    
    return this;
}

LibpostModelLoader.prototype.mongoose = function(schema, options) {
    var self  = this;
    var name  = options.Name;
    var lower = name.toLowerCase();
    var group = 'MODEL:'+name;
    
    try {
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

        // model denormalize sync 
        if(this._worker == 0 && dot.get(this._syncConf, 'denormalize.'+lower)) {
            setTimeout(function() {
                self._app.lib.denormalize.sync(name, self._app.boot.kue);
            }, 10000);
        }

        // init post hooks and listeners
        this.postHooks(Schema, name);
        this.listener(options, Schema.inspector);
        
        return Schema;        
    }
    catch(e) {
        self._log.error(group, e.stack);
    }
};

/**
 * ----------------------------------------------------------------
 * Model Post Hooks
 * ----------------------------------------------------------------
 */

LibpostModelLoader.prototype.postHooks = function(schema, name) {
    var self  = this;
    var lower = name.toLowerCase();
    
    // System_Users için işlem yapma 
    // (app.io modellerinden sadece users modeli event çalıştırıyor, kontrolünü kendi üzerinde sağlıyor)
    if(name == 'System_Users')
        return false;

    // pre save hook
    schema.pre('save', function (next) {
        var self    = this;
        self._isNew = self.isNew;
        self._isModified = {};
        
        // set _isModified object values
        _.each(self._doc, function(val, key) {
            self._isModified[key] = self.isModified(key);
        });

        next();
    });
    
    // post save hook
    schema.post('save', function (doc) {
        if(this._isNew)
            self._emitter.emit(lower+'_model_saved', {source: name, doc: doc});
        else
            self._emitter.emit(lower+'_model_updated', {source: name, doc: doc});
    });

    // post remove hook
    schema.post('remove', function (doc) {
        self._emitter.emit(lower+'_model_removed', {source: name, doc: doc});
    });    
}

/**
 * ----------------------------------------------------------------
 * Model Event Listeners
 * ----------------------------------------------------------------
 */

LibpostModelLoader.prototype.listener = function(options, inspector) {
    var self         = this;
    var Name         = options.Name;
    var Denorm       = options.Denorm;
    var EntityDenorm = options.EntityDenorm;
    var Size         = options.Size; 
    var Count        = options.Count;
    var CountRef     = options.CountRef;
    var Hook         = options.Hook;
    
    if(Denorm) {
        _.each(Denorm, function (value, key) {
            self.denorm(key.toLowerCase()+'_model_updated', inspector);
        });
    }

    if(Denorm && EntityDenorm) { // denormalize edilmesi gereken modelin entity addtoset durumunda çalıştırılması gerekiyor
        _.each(EntityDenorm, function (value) {
            self.entityDenorm(Name, Name.toLowerCase()+'_'+value+'_addtoset');
        });
    }
    
    if(Size) {
        // post hook'ta çalışacak size'ların bir kere çalışması yeterli
        self.sizePostHook(Name, inspector);
        
        // entity api endpoint'leri için çalışacak event'ler
        _.each(Size, function (target, source) {
            self.size(Name, source, target, inspector);
        });        
    }

    if(Count) {
        _.each(Count, function (target, source) {
            self.count(Name, target, source, inspector);
        });
    }

    if(CountRef) {
        _.each(CountRef, function (target, source) {
            self.countRef(Name, target, source, inspector);
        });
    }

    if(Hook) {
        _.each(Hook, function (hookData, action) {
            _.each(hookData, function(target, source) {
                self['hook_'+action](Name, source, target, inspector); 
            });
        });
    }
};

/**
 * ----------------------------------------------------------------
 * Model.Denorm
 * ----------------------------------------------------------------
 */

LibpostModelLoader.prototype.denorm = function(listener, inspector) {
    var self = this;

    this._emitter.on(listener, function(data) {
        // _dismissHook değişkeni geldiğinde denormalization güncellemesi çalıştırılmayacak
        if(data.doc.__dismissHook)
            return false;
        
        self._log.info('MODEL:LOADER:DENORM:'+listener, data);
        self._app.lib.denormalize.touch(data, inspector);
    });
};

/**
 * ----------------------------------------------------------------
 * Model.EntityDenorm
 * ----------------------------------------------------------------
 */

LibpostModelLoader.prototype.entityDenorm = function(name, listener) {
    var self = this;

    this._emitter.on(listener, function(data) {
        var id = data.id;
        
        if( ! id )
            return false;
        
        var Model = self._mongoose.model(name);
     
        Model.findById(id, function(err, doc) {
            if( err || ! doc )
                return false;

            // denormalize document
            doc.save(function(err) {});
        });
    });
};

/**
 * ----------------------------------------------------------------
 * Model.Size
 * ----------------------------------------------------------------
 */

// post hook'ta çalışacak size'ların bir kere çalışması yeterli
LibpostModelLoader.prototype.sizePostHook = function(name, inspector) {
    var self  = this;
    var lower = name.toLowerCase();

    // Model post hook events
    this._emitter.on(lower+'_model_saved', function(data) {
        self._denormalize.size(data, inspector);
    });

    this._emitter.on(lower+'_model_updated', function(data) {
        self._denormalize.size(data, inspector);
    });
};

LibpostModelLoader.prototype.size = function(name, source, target, inspector) {
    var self  = this;
    var lower = name.toLowerCase();

    // Entity api events
    this._emitter.on(lower+'_'+source+'_addtoset', function(data) {
        self._incr(name, target, data.id);
    });
    
    this._emitter.on(lower+'_'+source+'_pull', function(data) {
        self._decr(name, target, data.id);
    });
};

/**
 * ----------------------------------------------------------------
 * Model.Count
 * ----------------------------------------------------------------
 */

LibpostModelLoader.prototype.count = function(name, target, source, inspector) {
    var self  = this;
    var lower = name.toLowerCase();
    var Save  = inspector.Save.properties;
    var Alias = inspector.Alias;
    var ref   = dot.get(Save, Alias[source]+'.ref');

    if( ! ref )
        return this._log.error('LIBPOST:MODEL:LOADER:COUNT', 'reference not found');

    // Model post hook events 
    // (eğer post mask'e izin verilip kaydedilen field varsa ilk kaydedişte target'i güncelliyoruz)
    // (_model_updated için çalışmayacak)
    this._emitter.on(lower+'_model_saved', function(data) {
        var doc = data.doc;
        self._incr(ref, target, doc[Alias[source]]);
    });

    this._emitter.on(lower+'_model_removed', function(data) {
        var doc = data.doc;
        self._decr(ref, target, doc[Alias[source]]);
    });
    
    // Entity api events
    this._emitter.on(lower+'_'+source+'_addtoset', function(data) {
        self._incr(ref, target, data.value);
    });

    this._emitter.on(lower+'_'+source+'_pull', function(data) {
        self._decr(ref, target, data.value);
    });
};

/**
 * ----------------------------------------------------------------
 * Model.CountRef
 * ----------------------------------------------------------------
 */

LibpostModelLoader.prototype.countRef = function(name, target, source, inspector) {
    var self  = this;
    var lower = name.toLowerCase();
    var Save  = inspector.Save.properties;
    var Alias = inspector.Alias;
    var ref   = dot.get(Save, Alias[source]+'.ref');

    if( ! ref )
        return this._log.error('LIBPOST:MODEL:LOADER:COUNT_REF', 'reference not found');

    /**
     * reference count şimdilik daha sonra update edilebilecek (_model_updated) durumlar için çalışmıyor
     */
    
    // Model post hook events
    this._emitter.on(lower+'_model_saved', function(data) {
        var doc = data.doc;
        self._incr(ref, target, doc[Alias[source]]);
    });

    this._emitter.on(lower+'_model_removed', function(data) {
        var doc = data.doc;
        self._decr(ref, target, doc[Alias[source]]);
    });
};

/**
 * ----------------------------------------------------------------
 * Model.Hook (push)
 * ----------------------------------------------------------------
 */

LibpostModelLoader.prototype.hook_push = function(name, source, target, inspector) {
    var self  = this;
    var lower = name.toLowerCase();
    var Save  = inspector.Save.properties;
    var Alias = inspector.Alias;
    target    = target.split(':');
    var ref   = dot.get(Save, Alias[target[0]]+'.ref');

    if( ! ref )
        return this._log.error('LIBPOST:MODEL:LOADER:HOOK_PUSH', 'reference not found');

    // reference model
    var Model      = this._mongoose.model(ref);
    var ModelAlias = dot.get(Model.schema, 'inspector.Alias');

    // addToSet ile target modele push et
    this._emitter.on(lower+'_model_saved', function(data) {
        var doc       = data.doc;
        var SourceVal = doc[Alias[source]];
        
        if( ! SourceVal )
            return false;

        var update      = {$addToSet: {}};
        var type        = Object.prototype.toString.call(SourceVal);
        var TargetField = ModelAlias[target[1]];
        
        if(type == '[object Array]') 
            update.$addToSet[TargetField] = {$each: SourceVal};
        else
            update.$addToSet[TargetField] = SourceVal;

        // update reference
        self.update_hook(doc[Alias[target[0]]], update, Model, TargetField);
    });

    this._emitter.on(lower+'_model_removed', function(data) {
        var doc       = data.doc;
        var SourceVal = doc[Alias[source]];

        if( ! SourceVal )
            return false;
        
        var pull        = {$pull: {}};
        var pullAll     = {$pullAll: {}};
        var type        = Object.prototype.toString.call(SourceVal);
        var TargetField = ModelAlias[target[1]];
        var update;
        
        if(type == '[object Array]') {
            pullAll.$pullAll[TargetField] = SourceVal;
            update = pullAll;
        }
        else {
            pull.$pull[TargetField] = SourceVal;
            update = pull;
        }

        // update reference
        self.update_hook(doc[Alias[target[0]]], update, Model, TargetField);
    });
};


LibpostModelLoader.prototype.update_hook = function(id, update, Model, TargetField) {
    var self = this;
    
    Model.update({_id: id}, update, {}, function(err, raw) {
        if(err)
            self._log.error('LIBPOST:MODEL:LOADER:HOOK_PUSH', err);

        // find and save target model
        Model.findOne({_id: id}, function(err, doc) {
            if( err || ! doc )
                return;

            // denormalize içinde vs bu değişkene bakılacak,
            // bu tarz işlemden sonra denormalize çalışmasına gerek yok
            doc.__dismissHook = true;
            
            // set target field as modified
            doc.markModified(TargetField);
            
            // save document
            doc.save(function(err) {});                
        });
    });
};

/**
 * ----------------------------------------------------------------
 * Increment
 * ----------------------------------------------------------------
 */

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

    // get id type
    var type = Object.prototype.toString.call(id);
    
    if(type == '[object Array]') {
        if( ! id.length ) return false;
        cond = {_id: {$in: id}};
    }
    else {
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

/**
 * ----------------------------------------------------------------
 * Decrement
 * ----------------------------------------------------------------
 */

LibpostModelLoader.prototype._decr = function(model, field, id, num) {
    this._incr(model, field, id, num, true);
};

module.exports = function(app) {
    return new LibpostModelLoader(app);
};
