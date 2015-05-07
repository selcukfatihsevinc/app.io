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
        u  : {type: ObjectId, typeStr: 'ObjectId', required: true, ref: 'System_Users', alias: 'users'},
        r  : {type: ObjectId, typeStr: 'ObjectId', required: true, ref: 'System_Rooms', alias: 'rooms'},
        d  : {type: String, typeStr: 'String', required: true, alias: 'detail'},
        ca : {type: Date, typeStr: 'Date', alias: 'created_at', default: Date.now}
    };

    Schema.u.settings  = {initial: false};
    Schema.r.settings  = {initial: false};
    Schema.d.settings  = {initial: false};
    Schema.ca.settings = {initial: false};

    var inspector     = new Inspector(Schema).init();
    var MessageSchema = app.core.mongo.db.Schema(Schema);

    // plugins
    MessageSchema.plugin(query);

    // inspector
    MessageSchema.inspector = inspector;
    // MessageSchema.structure = Schema;

    // model options
    MessageSchema.inspector.Options = {
        singular : 'Message',
        plural   : 'Messages',
        columns  : ['users'],
        main     : 'users',
        perpage  : 25
    };

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    MessageSchema.pre('save', function (next) {
        var self = this;

        self._isNew = self.isNew;

        next();
    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    MessageSchema.post('save', function (doc) {

    });

    /**
     * ----------------------------------------------------------------
     * Superadmin Acl
     * ----------------------------------------------------------------
     */

    mongoose.connection.on('open', function() {
        if(app.acl && workerId == 0) {
            app.acl.allow('superadmin', 'system_messages', '*');
            _log.info('[acl:allow] superadmin:system_messages:*');
        }
    });

    return mongoose.model('System_Messages', MessageSchema);

};



