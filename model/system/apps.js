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
        n : {type: String, required: true, alias: 'name', unique: true},
        s : {type: String, required: true, alias: 'slug', unique: true},
        l : {type: String, required: true, alias: 'long', unique: true}
    };

    Schema.n.settings = {
        label: 'Name'
    };

    Schema.s.settings = {
        label: 'Slug'
    };

    Schema.l.settings = {
        label: 'Long Name'
    };

    var inspector  = new Inspector(Schema).init();
    var AppsSchema = app.core.mongo.db.Schema(Schema);

    // plugins
    AppsSchema.plugin(query);

    // inspector
    AppsSchema.inspector = inspector;

    // model options
    AppsSchema.inspector.Options = {
        singular : 'System App',
        plural   : 'System Apps',
        columns  : ['name', 'slug', 'long'],
        main     : 'name',
        perpage  : 10
    };

    // allow superadmin (mongoose connection bekliyor)
    mongoose.connection.on('open', function() {
        if(app.acl && workerId == 0) {
            app.acl.allow('superadmin', 'system_apps', '*');
            _log.info('[acl:allow] superadmin:system_apps:*');
        }
    });

    return mongoose.model('System_Apps', AppsSchema);

};



