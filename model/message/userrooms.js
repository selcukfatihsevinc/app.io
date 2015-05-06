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

    var inspector      = new Inspector(Schema).init();
    var UserRoomSchema = app.core.mongo.db.Schema(Schema);

    // plugins
    UserRoomSchema.plugin(query);

    // inspector
    UserRoomSchema.inspector = inspector;
    // UserRoomSchema.structure = Schema;

    // model options
    UserRoomSchema.inspector.Options = {
        singular : 'User Room',
        plural   : 'User Rooms',
        columns  : ['users'],
        main     : 'users',
        perpage  : 25
    };

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    UserRoomSchema.pre('save', function (next) {
        var self = this;

        self._isNew = self.isNew;

        next();
    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    UserRoomSchema.post('save', function (doc) {

    });

    /**
     * ----------------------------------------------------------------
     * Superadmin Acl
     * ----------------------------------------------------------------
     */

    mongoose.connection.on('open', function() {
        if(app.acl && workerId == 0) {
            app.acl.allow('superadmin', 'system_userrooms', '*');
            _log.info('[acl:allow] superadmin:system_userrooms:*');
        }
    });

    return mongoose.model('System_UserRooms', UserRoomSchema);

};



