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
        t  : {type: String, alias: 'title'},
        ut : {type: String, default: 'U', required: true, enum: ['A', 'U'], alias: 'upload_type'}, // A: Admin, U: User
        ty : {type: String, required: true, enum: ['L', 'S', 'C'], alias: 'type'}, // L: Local, S: Aws S3, C: Cloudinary
        b  : {type: Number, default: 0, alias: 'bytes'},
        u  : {type: String, alias: 'url'},
        p  : {type: String, alias: 'path'},
        w  : {type: Number, default: 0, alias: 'width'},
        h  : {type: Number, default: 0, alias: 'height'},
        e  : {type: String, alias: 'ext'},
        ca : {type: Date, alias: 'created_at', default: Date.now}
    };

    /**
     * ----------------------------------------------------------------
     * Settings
     * ----------------------------------------------------------------
     */

    Schema.n.settings = {label: 'Name'};
    Schema.t.settings = {label: 'Title'};
    Schema.p.settings = {label: 'Path'};

    /**
     * ----------------------------------------------------------------
     * Load Schema
     * ----------------------------------------------------------------
     */

    var formsObj = {
        filter: ['name', 'title', 'path']
    }
    formsObj['new'] = ['name', 'title'];
    
    var ImageSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'System_Images',
        Options: {
            singular : 'System Image',
            plural   : 'System Images',
            columns  : ['name', 'title', 'path', 'bytes', 'width', 'height'],
            extra    : ['type'], // extra fields
            main     : 'name',
            perpage  : 10
        },
        Forms: formsObj
    });


    // plugins
    ImageSchema.plugin(_query);

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

