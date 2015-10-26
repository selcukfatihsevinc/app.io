var dot = require('dotty');
var _   = require('underscore');

module.exports = function(app) {

    var _env      = app.get('env');
    var _log      = app.lib.logger;
    var mongoose  = app.core.mongo.mongoose;
    var ObjectId  = mongoose.Schema.Types.ObjectId;
    var Inspector = app.lib.inspector;
    var query     = app.lib.query;
    var workerId  = parseInt(process.env.worker_id);
    var emitter   = app.lib.schemaEmitter;
    var syncConf  = app.config[_env].sync;
    var _group    = 'MODEL:system.accounts';
    var _schema   = app.lib.schema;

    var Schema = {
        ap  : {type: ObjectId, typeStr: 'ObjectId', required: true, ref: 'System_Apps', alias: 'apps'},
        u   : {type: ObjectId, typeStr: 'ObjectId', ref: 'System_Users', alias: 'users', index: true},
        una : {type: String, typeStr: 'String', alias: 'users_name'},
        t   : {type: String, typeStr: 'String', required: true, enum: ['F', 'T', 'I', 'G', 'L', 'D'], alias: 'type'},
        sc  : {type: Number, typeStr: 'Number', default: 0, alias: 'score'},

        uid : {type: Number, typeStr: 'Number', alias: 'user_id'},
        ust : {type: String, typeStr: 'String', alias: 'user_id_str'},
        un  : {type: String, typeStr: 'String', alias: 'user_name'},
        dn  : {type: String, typeStr: 'String', alias: 'display_name'},
        pp  : {type: String, typeStr: 'String', alias: 'profile_photo'},
        tk  : {type: String, typeStr: 'String', required: true, alias: 'token'},
        rtk : {type: String, typeStr: 'String', alias: 'refresh_token'},
        tks : {type: String, typeStr: 'String', alias: 'token_secret'},

        ua  : {type: Date, typeStr: 'Date', default: Date.now, alias: 'updated_at'},
        ca  : {type: Date, typeStr: 'Date', default: Date.now, alias: 'created_at'}
    };

    Schema.ap.settings  = {initial: false};
    Schema.u.settings   = {label: 'User', display: 'name'};
    Schema.una.settings = {initial: false};

    Schema.t.settings = {
        initial: false,
        options: [
            {label: 'Facebook', value: 'F'},
            {label: 'Twitter', value: 'T'},
            {label: 'Instagram', value: 'I'},
            {label: 'Github', value: 'G'},
            {label: 'Linkedin', value: 'L'},
            {label: 'Dribbble', value: 'D'}
        ]
    };

    Schema.sc.settings  = {initial: false};
    Schema.uid.settings = {label: 'User Id'};
    Schema.ust.settings = {initial: false};
    Schema.un.settings  = {label: 'Username'};
    Schema.dn.settings  = {label: 'Display Name'};
    Schema.pp.settings  = {label: 'Profile Photo'};
    Schema.tk.settings  = {label: 'Token'};
    Schema.rtk.settings = {label: 'Refresh Token'};
    Schema.tks.settings = {label: 'Token Secret'};
    Schema.ua.settings  = {initial: false};
    Schema.ca.settings  = {initial: false};

    var inspector     = new Inspector(Schema).init();
    var AccountSchema = app.core.mongo.db.Schema(Schema);

    // plugins
    AccountSchema.plugin(query);

    // inspector
    AccountSchema.inspector = inspector;
    // AccountSchema.structure = Schema;

    // model options
    AccountSchema.inspector.Options = {
        singular   : 'System Account',
        plural     : 'System Accounts',
        columns    : ['users', 'type', 'user_id', 'user_name', 'display_name', 'profile_photo', 'token', 'token_secret'],
        main       : 'users',
        perpage    : 25
    };

    // schema owner
    AccountSchema.inspector.Owner = {
        field : 'u',
        alias : 'users',
        protect : {
            'get': true,
            'getid': true,
            'post': true,
            'put': true,
            'remove': true
        }
    };

    /**
     * ----------------------------------------------------------------
     * Denormalization
     * ----------------------------------------------------------------
     */

    var denorm = [
        {ref: 'System_Users', source: 'u', fields: {una: 'na'}},
    ];

    emitter.on('user_updated', function(user) {
        app.lib.denormalize.update('System_Accounts', 'System_Users', user.doc, denorm);
    });

    if(workerId == 0 && dot.get(syncConf, 'denormalize.system_accounts')) {
        // lib modelden önce çalıştığı için hemen çalıştırınca schema register olmuyor, 5sn sonra çalıştır
        setTimeout(function() {
            app.lib.denormalize.sync('System_Accounts', app.boot.kue);
        }, 10000);
    }

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    AccountSchema.pre('save', function (next) {

        var self    = this;
        self._isNew = self.isNew;

        app.lib.denormalize.fill(this, denorm, function() { next(); });

    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    AccountSchema.post('save', function (doc) {

        var self = this;

        if(self._isNew) {

        }

    });

    /**
     * ----------------------------------------------------------------
     * Superadmin Acl
     * ----------------------------------------------------------------
     */

        // allow superadmin (mongoose connection bekliyor)
    mongoose.connection.on('open', function() {
        if(app.acl && workerId == 0) {
            app.acl.allow('superadmin', 'system_accounts', '*');
            _log.info(_group+':ACL:ALLOW', 'superadmin:system_accounts:*');
        }
    });

    return mongoose.model('System_Accounts', AccountSchema);

};



