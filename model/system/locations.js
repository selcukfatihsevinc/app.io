var material = require('mongoose-materialized');
var php      = require('phpjs');
var _        = require('underscore');

module.exports = function(app) {

    var _log      = app.lib.logger;
    var mongoose  = app.core.mongo.mongoose;
    var ObjectId  = mongoose.Schema.Types.ObjectId;
    var Inspector = app.lib.inspector;
    var query     = app.lib.query;
    var workerId  = parseInt(process.env.worker_id);
    var _group    = 'MODEL:system.locations';

    var Schema = {
        parentId : {type: ObjectId, typeStr: 'ObjectId', ref: 'System_Locations', alias: 'parentId', index: true},
        id  : {type: String, typeStr: 'String', required: true, alias: 'import_id', unique: true},
        n   : {type: String, typeStr: 'String', alias: 'name'},
        an  : {type: String, typeStr: 'String', alias: 'asciiname'},
        sn  : {type: String, typeStr: 'String', alias: 'sortname'},
        aen : {type: String, typeStr: 'String', alias: 'alternate_en'},
        atr : {type: String, typeStr: 'String', alias: 'alternate_tr'},
        l   : [{type: Number, typeStr: 'Number', alias: 'location'}],
        fc  : {type: String, typeStr: 'String', alias: 'feature_code'},
        p   : {type: Number, typeStr: 'Number', default: 0, alias: 'population'}
    };

    Schema.parentId.settings = {initial: false};
    Schema.id.settings   = {initial: false};
    Schema.n.settings    = {initial: false};
    Schema.an.settings   = {initial: false};
    Schema.sn.settings   = {initial: false};
    Schema.aen.settings  = {initial: false};
    Schema.atr.settings  = {initial: false};
    Schema.l[0].settings = {initial: false};
    Schema.fc.settings   = {initial: false};
    Schema.p.settings    = {initial: false};

    var inspector      = new Inspector(Schema).init();
    var LocationSchema = app.core.mongo.db.Schema(Schema);

    // indexes
    LocationSchema.index({l: '2d'});
    LocationSchema.index({p: -1});

    // plugins
    LocationSchema.plugin(query);
    LocationSchema.plugin(material);

    // inspector
    LocationSchema.inspector = inspector;

    // model options
    LocationSchema.inspector.Options = {
        singular : 'System Location',
        plural   : 'System Locations',
        columns  : ['name'],
        main     : 'name',
        perpage  : 10
    };

    // allow superadmin (mongoose connection bekliyor)
    mongoose.connection.on('open', function() {
        if(app.acl && workerId == 0) {
            app.acl.allow('superadmin', 'system_locations', '*');
            _log.info(_group+':ACL:ALLOW', 'superadmin:system_locations:*');
        }
    });

    return mongoose.model('System_Locations', LocationSchema);

};

