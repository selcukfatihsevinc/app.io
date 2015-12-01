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
        r  : {type: ObjectId, required: true, ref: 'System_Rooms', alias: 'rooms'},
        d  : {type: String, required: true, alias: 'detail'},
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

    var MessageSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'System_Messages',
        Options: {
            singular : 'System Message',
            plural   : 'System Messages',
            columns  : ['users'],
            main     : 'users',
            perpage  : 25
        }
    });

    // plugins
    MessageSchema.plugin(_query);

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

        var self = this;
        if(self._isNew) {}

    });

    return _mongoose.model('System_Messages', MessageSchema);

};



