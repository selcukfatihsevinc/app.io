var php = require('phpjs');
var _   = require('underscore');

module.exports = function(app) {

    var _log      = app.system.logger;
    var mongoose  = app.core.mongo.mongoose;
    var ObjectId  = mongoose.Schema.Types.ObjectId;
    var Inspector = app.lib.inspector;
    var query     = app.lib.query;
    var workerId  = parseInt(process.env.worker_id);

    var Schema = {
        ap : {type: ObjectId, required: true, ref: 'System_Apps', alias: 'apps'},
        u  : {type: ObjectId, required: true, ref: 'System_Users', alias: 'users'},
        n  : {type: String, required: true, alias: 'name'},
        o  : {type: String, required: true, alias: 'object'},
        f  : {type: String, required: true, alias: 'filter'}
    };

    Schema.ap.settings = {initial: false};
    Schema.u.settings = {initial: false};

    Schema.n.settings = {
        label: 'Name'
    };

    Schema.o.settings = {
        label: 'Object'
    };

    Schema.f.settings = {
        label: 'Filter'
    };

    var inspector    = new Inspector(Schema).init();
    var FilterSchema = app.core.mongo.db.Schema(Schema);

    // plugins
    FilterSchema.plugin(query);

    // inspector
    FilterSchema.inspector = inspector;

    // model options
    FilterSchema.inspector.Options = {
        singular : 'Filter',
        plural   : 'Filters',
        columns  : ['name', 'object'],
        main     : 'name',
        perpage  : 25
    };

    // allow superadmin (mongoose connection bekliyor)
    mongoose.connection.on('open', function() {
        if(app.acl && workerId == 0) {
            app.acl.allow('superadmin', 'system_filters', '*');
            _log.info('[acl:allow] superadmin:system_filters:*');
        }
    });

    return mongoose.model('System_Filters', FilterSchema);

};



