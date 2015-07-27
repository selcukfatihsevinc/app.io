var material     = require('mongoose-materialized');
var mongoosastic = require('mongoosastic');
var request      = require('request');
var php          = require('phpjs');
var dot          = require('dotty');
var _            = require('underscore');

module.exports = function(app) {

    var _env      = app.get('env');
    var _log      = app.lib.logger;
    var mongoose  = app.core.mongo.mongoose;
    var ObjectId  = mongoose.Schema.Types.ObjectId;
    var Inspector = app.lib.inspector;
    var query     = app.lib.query;
    var workerId  = parseInt(process.env.worker_id);
    var syncConf  = app.config[_env].sync;
    var elastic   = app.config[_env].elasticsearch;
    var emitter   = app.lib.schemaEmitter;
    var _group    = 'MODEL:system.locations';

    var Schema = {
        parentId : {type: ObjectId, typeStr: 'ObjectId', ref: 'System_Locations', alias: 'parentId', index: true},
        id  : {type: Number, typeStr: 'Number', required: true, alias: 'import_id', unique: true},
        n   : {type: String, typeStr: 'String', alias: 'name', es_indexed: true},
        an  : {type: String, typeStr: 'String', alias: 'asciiname', es_indexed: true, index: true},
        uri : {type: String, typeStr: 'String', alias: 'uri', index: true},
        uen : [{type: String, typeStr: 'String', alias: 'uri_en', index: true}],
        utr : [{type: String, typeStr: 'String', alias: 'uri_tr', index: true}],
        uc  : {type: String, typeStr: 'String', alias: 'uri_code', index: true},
        aen : [{type: String, typeStr: 'String', alias: 'alternate_en', es_indexed: true}],
        atr : [{type: String, typeStr: 'String', alias: 'alternate_tr', es_indexed: true}],
        l   : [{type: Number, typeStr: 'Number', alias: 'location'}],
        fcl : {type: String, typeStr: 'String', alias: 'feature_class'},
        fc  : {type: String, typeStr: 'String', alias: 'feature_code', es_indexed: true, index: true},
        cc  : {type: String, typeStr: 'String', alias: 'country_code', es_indexed: true, index: true},
        p   : {type: Number, typeStr: 'Number', default: 0, alias: 'population', es_indexed: true},
        w   : {type: Number, typeStr: 'Number', default: 0, alias: 'weight', es_indexed: true},
        s   : {type: Number, typeStr: 'Number', default: 0, alias: 'score', es_indexed: true}
    };

    Schema.parentId.settings = {initial: false};
    Schema.id.settings     = {initial: false};
    Schema.n.settings      = {initial: false};
    Schema.an.settings     = {label: 'Ascii Name'};
    Schema.uri.settings    = {initial: false};
    Schema.uen[0].settings = {initial: false};
    Schema.utr[0].settings = {initial: false};
    Schema.uc.settings     = {initial: false};
    Schema.aen[0].settings = {initial: false};
    Schema.atr[0].settings = {initial: false};
    Schema.l[0].settings   = {initial: false};
    Schema.fcl.settings    = {initial: false};
    Schema.fc.settings     = {initial: false};
    Schema.cc.settings     = {initial: false};
    Schema.p.settings      = {initial: false};
    Schema.w.settings      = {initial: false};
    Schema.s.settings      = {initial: false};

    var inspector      = new Inspector(Schema).init();
    var LocationSchema = app.core.mongo.db.Schema(Schema);

    // indexes
    LocationSchema.index({l: '2d'});
    LocationSchema.index({p: -1});

    // plugins
    LocationSchema.plugin(query);
    LocationSchema.plugin(material);
    LocationSchema.plugin(mongoosastic, {
        host: elastic.host,
        port: elastic.port,
        auth: elastic.auth
    });

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

    /**
     * ----------------------------------------------------------------
     * Denormalization
     * ----------------------------------------------------------------
     */

    var denorm = [
        {ref: 'System_Locations', source: 'parentId', fields: {pn: 'n', pan: 'an', pen: 'aen', ptr: 'atr', pfc: 'fc'}}
    ];

    emitter.on('location_updated', function(location) {
        app.lib.denormalize.update('System_Locations', 'System_Locations', location.doc, denorm);
    });

    if(workerId == 0 && dot.get(syncConf, 'denormalize.system_locations')) {
        // lib modelden önce çalıştığı için hemen çalıştırınca schema register olmuyor, 5sn sonra çalıştır
        setTimeout(function() {
            app.lib.denormalize.sync('System_Locations', app.boot.kue);
        }, 10000);
    }

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    LocationSchema.pre('save', function (next) {

        var self    = this;
        self._isNew = self.isNew;

        if(this.fc != 'PCLI') {
            var loc = mongoose.model('System_Locations');

            loc.findOne({fc: 'PCLI', cc: this.cc}, function(err, parent) {
                if( err || ! parent )
                    return app.lib.denormalize.fill(self, denorm, function() { next(); });

                self.cn  = parent.n;
                self.can = parent.an;
                self.cen = parent.aen;
                self.ctr = parent.atr;

                app.lib.denormalize.fill(self, denorm, function() { next(); });
            });
        }
        else
            app.lib.denormalize.fill(this, denorm, function() { next(); });

    });

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    LocationSchema.post('save', function (doc) {

        // emit event
        emitter.emit('location_updated', {doc: doc, isNew: this._isNew});

    });

    /**
     * ----------------------------------------------------------------
     * Superadmin Acl
     * ----------------------------------------------------------------
     */

    // allow superadmin (mongoose connection bekliyor)
    mongoose.connection.on('open', function() {
        if(app.acl && workerId == 0) {
            app.acl.allow('superadmin', 'system_locations', '*');
            _log.info(_group+':ACL:ALLOW', 'superadmin:system_locations:*');
        }
    });


    var Location = mongoose.model('System_Locations', LocationSchema);

    /*
    Location.esTruncate(function(err) {

    });
    */

    if(workerId == 0 && dot.get(syncConf, 'index.system_locations')) {
        var stream = Location.synchronize();
        var count  = 0;

        stream.on('data', function (err, doc) {
            console.log('data: '+count++);
        });

        stream.on('close', function () {
            console.log('indexed '+count+' documents!');
        });

        stream.on('error', function (err) {
            console.log(err);
        });
    }

    return Location;

};

