var dot = require('dotty');
var _   = require('underscore');

module.exports = function(app) {

    var _env      = app.get('env');
    var _log      = app.lib.logger;
    var _mongoose = app.core.mongo.mongoose;
    var _query    = app.lib.query;
    var _emitter  = app.lib.schemaEmitter;

    // types
    var ObjectId  = _mongoose.Schema.Types.ObjectId;
    var Mixed     = _mongoose.Schema.Types.Mixed;

    /**
     * ----------------------------------------------------------------
     * Schema
     * ----------------------------------------------------------------
     */

    var Schema = {
        ap  : {type: ObjectId, required: true, ref: 'System_Apps', alias: 'apps'},
        u   : {type: ObjectId, ref: 'System_Users', alias: 'users', index: true},
        t   : {type: String, required: true, enum: ['F', 'T', 'I', 'G', 'L', 'D', 'FS'], alias: 'type'},
        sc  : {type: Number, default: 0, alias: 'score'},

        uid : {type: Number, alias: 'user_id'},
        ust : {type: String, alias: 'user_id_str'},
        un  : {type: String, alias: 'user_name'},
        dn  : {type: String, alias: 'display_name'},
        pp  : {type: String, alias: 'profile_photo'},
        l   : {type: String, alias: 'location'},
        tk  : {type: String, required: true, alias: 'token'},
        rtk : {type: String, alias: 'refresh_token'},
        tks : {type: String, alias: 'token_secret'},

        ua  : {type: Date, default: Date.now, alias: 'updated_at'},
        ca  : {type: Date, default: Date.now, alias: 'created_at'}
    };

    /**
     * ----------------------------------------------------------------
     * Settings
     * ----------------------------------------------------------------
     */

    Schema.u.settings = {label: 'User', display: 'name'};
    Schema.t.settings = {
        options: [
            {label: 'Facebook', value: 'F'},
            {label: 'Twitter', value: 'T'},
            {label: 'Instagram', value: 'I'},
            {label: 'Github', value: 'G'},
            {label: 'Linkedin', value: 'L'},
            {label: 'Dribbble', value: 'D'},
            {label: 'Foursquare', value: 'FS'}
        ]
    };

    Schema.uid.settings = {label: 'User Id'};
    Schema.un.settings  = {label: 'Username'};
    Schema.dn.settings  = {label: 'Display Name'};
    Schema.pp.settings  = {label: 'Profile Photo'};
    Schema.pp.settings  = {label: 'Location'};
    Schema.tk.settings  = {label: 'Token'};
    Schema.rtk.settings = {label: 'Refresh Token'};
    Schema.tks.settings = {label: 'Token Secret'};

    /**
     * ----------------------------------------------------------------
     * Load Schema
     * ----------------------------------------------------------------
     */

    var AccountSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'System_Accounts',
        Options: {
            singular   : 'System Account',
            plural     : 'System Accounts',
            columns    : ['users', 'type', 'user_id', 'user_name', 'display_name', 'profile_photo', 'location', 'token', 'token_secret'],
            main       : 'users',
            perpage    : 25
        },
        Owner: {
            field : 'u',
            alias : 'users',
            protect : {
                'get': true,
                'getid': true,
                'post': true,
                'put': true,
                'remove': true
            }
        }
    });

    // plugins
    AccountSchema.plugin(_query);

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    AccountSchema.pre('save', function (next) {

        var self    = this;
        self._isNew = self.isNew;
        next();

    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    AccountSchema.post('save', function (doc) {

        var self = this;
        if(self._isNew) {}

    });

    return _mongoose.model('System_Accounts', AccountSchema);

};



