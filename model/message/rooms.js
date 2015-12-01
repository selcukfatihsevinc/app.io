var dot = require('dotty');

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
        n  : {type: String, required: true, alias: 'name'},
        s  : {type: String, alias: 'slug'},
        d  : {type: String, alias: 'detail'},
        rm : {type: String, required: true, alias: 'ref_model'},
        ri : {type: String, required: true, alias: 'ref_id'},
        au : [{type: ObjectId, required: true, ref: 'System_Users', alias: 'allowed_users'}],
        bu : [{type: ObjectId, ref: 'System_Users', alias: 'banned_users'}],
        u  : {type: ObjectId, ref: 'System_Users', alias: 'users'}, // room owner if necessary (unique index, sparse: true)
        ca : {type: Date, alias: 'created_at', default: Date.now}
    };

    /**
     * ----------------------------------------------------------------
     * Settings
     * ----------------------------------------------------------------
     */

    /**
     * ----------------------------------------------------------------
     * Load Schema
     * ----------------------------------------------------------------
     */

    var RoomSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'System_Rooms',
        Options: {
            singular : 'System Room',
            plural   : 'System Rooms',
            columns  : ['users'],
            main     : 'users',
            perpage  : 25
        }
    });

    // plugins
    RoomSchema.plugin(_query);

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

        var self = this;
        if(self._isNew) {}

    });

    return _mongoose.model('System_Rooms', RoomSchema);

};



