var extend = require('extend');
var dot    = require('dotty');

function LibpostModelLoader(app) {
    this._app       = app;
    this._env       = app.get('env');
    this._log       = app.lib.logger;
    this._inspector = app.lib.inspector;
    this._mongo     = app.core.mongo;
    this._mongoose  = app.core.mongo.mongoose;
    this._worker    = parseInt(process.env.worker_id);
    this._syncConf  = app.config[this._env].sync;

    return this;
}

LibpostModelLoader.prototype.mongoose = function(schema, options) {
    var self  = this;
    var lower = options.Name.toLowerCase();
    var group = 'MODEL:'+options.Name;

    // create schema
    var Schema = this._mongo.db.Schema(schema);

    // create inspector
    var Inspector    = new this._inspector(schema).init();
    Schema.inspector = Inspector;
    // Schema.structure = schema;
    
    // extend inspector with options
    extend(Schema.inspector, options);

    // allow superadmin (mongoose connection bekliyor)
    if(this._app.acl && this._worker == 0 && dot.get(this._syncConf, 'data.superacl')) {
        this._mongoose.connection.on('open', function() {
            self._app.acl.allow('superadmin', lower, '*');
            self._log.info(group+':ACL:ALLOW', 'superadmin:'+lower+':*', 'gray');
        });
    }

    if(this._worker == 0 && dot.get(this._syncConf, 'denormalize.'+lower)) {
        setTimeout(function() {
            self._app.lib.denormalize.sync(options.Name, self._app.boot.kue);
        }, 10000);
    }

    return Schema;
};

module.exports = function(app) {
    return new LibpostModelLoader(app);
};
