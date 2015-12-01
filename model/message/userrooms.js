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
        u  : {type: ObjectId, required: true, ref: 'System_Users', alias: 'users'},
        r  : {type: ObjectId, required: true, ref: 'System_Rooms', alias: 'rooms'}, // bazı field'ları denormalize et
        m  : {type: ObjectId, ref: 'System_Messages', alias: 'last_message'}, // bazı field'ları denormalize et
        rd : {type: Number, default: 0, alias: 'unread'},
        ua : {type: Date, alias: 'updated_at', default: Date.now},
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

    var UserRoomSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'System_UserRooms',
        Options: {
            singular : 'System User Room',
            plural   : 'System User Rooms',
            columns  : ['users'],
            main     : 'users',
            perpage  : 25
        }
    });

    // plugins
    UserRoomSchema.plugin(_query);

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

        var self = this;
        if(self._isNew) {}

    });

    return _mongoose.model('System_UserRooms', UserRoomSchema);

};



