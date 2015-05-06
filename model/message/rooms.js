var dot = require('dotty');

module.exports = function(app) {

    var _env      = app.get('env');
    var _log      = app.system.logger;
    var mongoose  = app.core.mongo.mongoose;
    var ObjectId  = mongoose.Schema.Types.ObjectId;
    var Inspector = app.lib.inspector;
    var query     = app.lib.query;
    var workerId  = parseInt(process.env.worker_id);
    var emitter   = app.lib.schemaEmitter;
    var syncConf  = app.config[_env].sync;

    var Schema = {
        u : {type: ObjectId, typeStr: 'ObjectId', ref: 'System_Users', alias: 'users'}
    };

    Schema.u.settings = {initial: false};

    var inspector  = new Inspector(Schema).init();
    var RoomSchema = app.core.mongo.db.Schema(Schema);

    // plugins
    RoomSchema.plugin(query);

    // inspector
    RoomSchema.inspector = inspector;
    // RoomSchema.structure = Schema;

    // model options
    RoomSchema.inspector.Options = {
        singular : 'Room',
        plural   : 'Rooms',
        columns  : ['users'],
        main     : 'users',
        perpage  : 25
    };

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    RoomSchema.pre('save', function (next) {
        var self = this;

        self._isNew = self.isNew;

        next();
    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    RoomSchema.post('save', function (doc) {

    });

    /**
     * ----------------------------------------------------------------
     * Superadmin Acl
     * ----------------------------------------------------------------
     */

    mongoose.connection.on('open', function() {
        if(app.acl && workerId == 0) {
            app.acl.allow('superadmin', 'system_rooms', '*');
            _log.info('[acl:allow] superadmin:system_rooms:*');
        }
    });

    return mongoose.model('System_Rooms', RoomSchema);

};



