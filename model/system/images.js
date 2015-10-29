var php = require('phpjs');
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
        ap : {type: ObjectId, required: true, ref: 'System_Apps', alias: 'apps', index: true},
        ir : {type: ObjectId, required: true, ref: 'System_Users', alias: 'users', index: true},
        n  : {type: String, required: true, alias: 'name'},
        ut : {type: String, default: 'U', required: true, enum: ['A', 'U'], alias: 'upload_type'}, // A: Admin, U: User
        ty : {type: String, required: true, enum: ['L', 'S', 'C'], alias: 'type'}, // L: Local, S: Aws S3, C: Cloudinary
        b  : {type: Number, default: 0, alias: 'bytes'},
        u  : {type: String, alias: 'url'},
        p  : {type: String, alias: 'path'},
        ca : {type: Date, alias: 'created_at', default: Date.now}
    };

    /**
     * ----------------------------------------------------------------
     * Settings
     * ----------------------------------------------------------------
     */

    Schema.n.settings = {label: 'Name'};

    /**
     * ----------------------------------------------------------------
     * Load Schema
     * ----------------------------------------------------------------
     */

    var ImageSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'System_Images',
        Options: {
            singular : 'System Image',
            plural   : 'System Images',
            columns  : ['name', 'path'],
            extra    : ['type'], // extra fields
            main     : 'name',
            perpage  : 10
        }
    });


    // plugins
    ImageSchema.plugin(_query);

    /**
     * ----------------------------------------------------------------
     * Denormalization
     * ----------------------------------------------------------------
     */

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    ImageSchema.pre('save', function (next) {

        var self    = this;
        self._isNew = self.isNew;
        next();

    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    ImageSchema.post('save', function (doc) {

        var self = this;
        if(self._isNew) {}

    });

    return _mongoose.model('System_Images', ImageSchema);

};

