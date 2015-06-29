var php = require('phpjs');
var _   = require('underscore');

module.exports = function(app) {

    var _log      = app.lib.logger;
    var mongoose  = app.core.mongo.mongoose;
    var ObjectId  = mongoose.Schema.Types.ObjectId;
    var Inspector = app.lib.inspector;
    var query     = app.lib.query;
    var workerId  = parseInt(process.env.worker_id);
    var _group    = 'MODEL:system.images';

    var Schema = {
        ap : {type: ObjectId, typeStr: 'ObjectId', required: true, ref: 'System_Apps', alias: 'apps', index: true},
        ir : {type: ObjectId, typeStr: 'ObjectId', required: true, ref: 'System_Users', alias: 'users', index: true},
        n  : {type: String, typeStr: 'String', required: true, alias: 'name'},
        ut : {type: String, typeStr: 'String', default: 'U', required: true, enum: ['A', 'U'], alias: 'upload_type'}, // A: Admin, U: User
        ty : {type: String, typeStr: 'String', required: true, enum: ['L', 'S', 'C'], alias: 'type'}, // L: Local, S: Aws S3, C: Cloudinary
        b  : {type: Number, typeStr: 'Number', default: 0, alias: 'bytes'},
        u  : {type: String, typeStr: 'String', alias: 'url'},
        p  : {type: String, typeStr: 'String', alias: 'path'},
        ca : {type: Date, typeStr: 'Date', alias: 'created_at', default: Date.now}
    };

    Schema.ap.settings = {initial: false};
    Schema.ir.settings = {initial: false};
    Schema.n.settings  = {label: 'Name'};
    Schema.ut.settings = {initial: false};
    Schema.ty.settings = {initial: false};
    Schema.b.settings  = {initial: false};
    Schema.u.settings  = {initial: false};
    Schema.p.settings  = {initial: false, image: true};
    Schema.ca.settings = {initial: false};

    var inspector   = new Inspector(Schema).init();
    var ImageSchema = app.core.mongo.db.Schema(Schema);

    // plugins
    ImageSchema.plugin(query);

    // inspector
    ImageSchema.inspector = inspector;

    // model options
    ImageSchema.inspector.Options = {
        singular : 'System Image',
        plural   : 'System Images',
        columns  : ['name', 'path'],
        extra    : ['type'], // extra fields
        main     : 'name',
        perpage  : 10
    };

    // allow superadmin (mongoose connection bekliyor)
    mongoose.connection.on('open', function() {
        if(app.acl && workerId == 0) {
            app.acl.allow('superadmin', 'system_images', '*');
            _log.info(_group+':ACL:ALLOW', 'superadmin:system_images:*');
        }
    });

    return mongoose.model('System_Images', ImageSchema);

};

