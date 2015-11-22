var extend = require('extend');
var dot    = require('dotty');

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

        return Schema;        
    }
    catch(e) {
        self._log.error(group, e.stack);
    }
};

module.exports = function(app) {
    return new LibpostModelLoader(app);
};
