var material     = require('mongoose-materialized');
var mongoosastic = require('mongoosastic');
var request      = require('request');
var slug         = require('speakingurl');
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
    var isWorker  = app.get('isworker');
    var syncConf  = app.config[_env].sync;
    var elastic   = app.config[_env].elasticsearch;
    var emitter   = app.lib.schemaEmitter;
    var _group    = 'MODEL:system.locations';
    var _index    = dot.get(syncConf, 'index.system_locations');

    var Schema = {
        parentId : {type: ObjectId, typeStr: 'ObjectId', ref: 'System_Locations', alias: 'parentId', index: true},
        id  : {type: Number, typeStr: 'Number', required: true, alias: 'import_id', unique: true},
        n   : {type: String, typeStr: 'String', alias: 'name', es_indexed: true, index: true},
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

    Schema.parentId.settings = {label: 'Parent', display: 'asciiname'};
    Schema.id.settings     = {initial: false};
    Schema.n.settings      = {label: 'Name'};
    Schema.an.settings     = {label: 'Ascii Name'};
    Schema.uri.settings    = {initial: false};
    Schema.uen[0].settings = {initial: false};
    Schema.utr[0].settings = {initial: false};
    Schema.uc.settings     = {initial: false};
    Schema.aen[0].settings = {label: 'English Name'};
    Schema.atr[0].settings = {label: 'Turkish Name'};
    Schema.l[0].settings   = {initial: false};
    Schema.fcl.settings    = {initial: false};
    Schema.fc.settings     = {label: 'Feature Code'};
    Schema.cc.settings     = {label: 'Country Code'};
    Schema.p.settings      = {label: 'Population'};
    Schema.w.settings      = {initial: false};
    Schema.s.settings      = {initial: false};

    var inspector      = new Inspector(Schema).init();
    var LocationSchema = app.core.mongo.db.Schema(Schema);

    // indexes
    LocationSchema.index({l: '2d'});
    LocationSchema.index({p: -1});
    LocationSchema.index({aen: 1});
    LocationSchema.index({atr: 1});

    // plugins
    LocationSchema.plugin(query);
    LocationSchema.plugin(material);
    LocationSchema.plugin(mongoosastic, {
        host: elastic.host,
        port: elastic.port,
        auth: elastic.auth,
        bulk: {
            delay: 50
        }
    });

    // inspector
    LocationSchema.inspector = inspector;

    // model options
    LocationSchema.inspector.Options = {
        singular : 'System Location',
        plural   : 'System Locations',
        columns  : ['name', 'asciiname', 'alternate_tr', 'alternate_en'],
        main     : 'name',
        perpage  : 10
    };

    LocationSchema.inspector.Forms = {
        'filter': ['name', 'asciiname', 'alternate_tr', 'alternate_en', 'uri_code', 'feature_code', 'country_code']
    };

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    LocationSchema.pre('save', function (next) {

        var self    = this;
        self._isNew = self.isNew;

        if(self.an)
            self.uri = slug(self.an.toLowerCase(), {separator: '-', mark: false});

        if(self.aen.length) {
            var uen = [];
            _.each(self.aen, function(aen, key) {
                uen.push( slug(aen.toLowerCase(), {separator: '-', mark: false}) );
            });

            self.uen = uen;
        }

        if(self.atr.length) {
            var utr = [];
            _.each(self.atr, function(atr, key) {
                utr.push( slug(atr.toLowerCase(), {separator: '-', mark: false, lang: 'tr'}) );
            });

            self.utr = utr;
        }

        next();

    });

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    LocationSchema.post('save', function (doc) {

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

    if(workerId == 0 && isWorker && _index) {
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

