module.exports = function(app) {

    var _log      = app.system.logger;
    var mongoose  = app.core.mongo.mongoose;
    var ObjectId  = mongoose.Schema.Types.ObjectId;
    var Inspector = app.lib.inspector;
    var query     = app.lib.query;
    var workerId  = parseInt(process.env.worker_id);

    var Schema = {
        ap : {type: ObjectId, required: true, ref: 'System_Apps', alias: 'apps'},
        n  : {type: String, required: true, alias: 'name'},
        s  : {type: String, required: true, alias: 'slug'}
    };

    Schema.ap.settings = {
        initial: false
    };

    Schema.n.settings = {
        label: 'Name'
    };

    Schema.s.settings = {
        label: 'Slug'
    };

    var inspector    = new Inspector(Schema).init();
    var ObjectSchema = app.core.mongo.db.Schema(inspector.Mongoose);

    // plugins
    ObjectSchema.plugin(query);

    // inspector
    ObjectSchema.inspector = inspector.Base;

    // compound index
    ObjectSchema.index({ap: 1, n: 1}, {unique: true});
    ObjectSchema.index({ap: 1, s: 1}, {unique: true});

    // model options
    ObjectSchema.inspector.Options = {
        singular : 'Object',
        plural   : 'Objects',
        columns  : ['name', 'slug'],
        main     : 'name',
        perpage  : 25,
        nocreate : true,
        nodelete : true,
        noedit   : true
    };

    // allow superadmin (mongoose connection bekliyor)
    mongoose.connection.on('open', function() {
        if(app.acl && workerId == 0) {
            app.acl.allow('superadmin', 'system_objects', '*');
            _log.info('[acl:allow] superadmin:system_objects:*');
        }
    });

    return mongoose.model('System_Objects', ObjectSchema);

};



