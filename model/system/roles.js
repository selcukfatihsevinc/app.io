module.exports = function(app) {

    var _log      = app.lib.logger;
    var mongoose  = app.core.mongo.mongoose;
    var ObjectId  = mongoose.Schema.Types.ObjectId;
    var Inspector = app.lib.inspector;
    var query     = app.lib.query;
    var workerId  = parseInt(process.env.worker_id);
    var emitter   = app.lib.schemaEmitter;
    var _group    = 'MODEL:system.roles';

    var Schema = {
        ap : {type: ObjectId, typeStr: 'ObjectId', required: true, ref: 'System_Apps', alias: 'apps'},
        n  : {type: String, typeStr: 'String', required: true, alias: 'name'},
        s  : {type: String, typeStr: 'String', required: true, alias: 'slug'}
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

    var inspector  = new Inspector(Schema).init();
    var RoleSchema = app.core.mongo.db.Schema(Schema);

    // plugins
    RoleSchema.plugin(query);

    // inspector
    RoleSchema.inspector = inspector;

    // compound index
    RoleSchema.index({ap: 1, n: 1}, {unique: true});
    RoleSchema.index({ap: 1, s: 1}, {unique: true});

    // model options
    RoleSchema.inspector.Options = {
        singular : 'System Role',
        plural   : 'System Roles',
        columns  : ['name', 'slug'],
        main     : 'name',
        perpage  : 25,
        nodelete : true
    };

    RoleSchema.post('save', function (doc) {

        // emit event
        emitter.emit('role_updated', {doc: doc});

    });

    // allow superadmin (mongoose connection bekliyor)
    mongoose.connection.on('open', function() {
        if(app.acl && workerId == 0) {
            app.acl.allow('superadmin', 'system_roles', '*');
            _log.info(_group+':ACL:ALLOW', 'superadmin:system_roles:*');
        }
    });

    return mongoose.model('System_Roles', RoleSchema);

};



