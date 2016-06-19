var material     = require('mongoose-materialized');
var mongoosastic = require('mongoosastic');
var slug         = require('speakingurl');
var php          = require('phpjs');
var dot          = require('dotty');
var _            = require('underscore');

module.exports = function(app) {

    var _env      = app.get('env');
    var _log      = app.lib.logger;
    var _mongoose = app.core.mongo.mongoose;
    var _query    = app.lib.query;
    var _emitter  = app.lib.schemaEmitter;
    var _syncConf = app.config[_env].sync;
    var _index    = dot.get(_syncConf, 'index.system_locations');
    var _elastic  = app.config[_env].elasticsearch || dot.get(app.config[_env], 'data.elasticsearch');
    var _worker   = parseInt(process.env.worker_id);
    var _isWorker = app.get('isworker');
    var _group    = 'MODEL:system.locations';

    // types
    var ObjectId  = _mongoose.Schema.Types.ObjectId;
    var Mixed     = _mongoose.Schema.Types.Mixed;

    /**
     * ----------------------------------------------------------------
     * Schema
     * ----------------------------------------------------------------
     */

    var Schema = {
        parentId : {type: ObjectId, ref: 'System_Locations', alias: 'parentId', index: true},
        id  : {type: Number, default: 0, alias: 'import_id', unique: true, sparse: true},
        n   : {type: String, required: true, alias: 'name', es_indexed: true, index: true},
        an  : {type: String, required: true, alias: 'asciiname', es_indexed: true, index: true},
        uri : {type: String, required: true, alias: 'uri', index: true},
        uen : [{type: String, alias: 'uri_en', index: true}],
        utr : [{type: String, alias: 'uri_tr', index: true}],
        uc  : {type: String, required: true, alias: 'uri_code', index: true},
        aen : [{type: String, alias: 'alternate_en', es_indexed: true}],
        atr : [{type: String, alias: 'alternate_tr', es_indexed: true}],
        l   : [{type: Number, alias: 'location'}],
        fcl : {type: String, alias: 'feature_class'},
        fc  : {type: String, required: true, alias: 'feature_code', es_indexed: true, index: true},
        cc  : {type: String, required: true, alias: 'country_code', es_indexed: true, index: true},
        p   : {type: Number, default: 0, alias: 'population', es_indexed: true},
        w   : {type: Number, default: 0, alias: 'weight', es_indexed: true},
        s   : {type: Number, default: 0, alias: 'score', es_indexed: true}
    };

    /**
     * ----------------------------------------------------------------
     * Settings
     * ----------------------------------------------------------------
     */

    Schema.parentId.settings = {label: 'Parent', display: 'asciiname'};
    Schema.n.settings        = {label: 'Name'};
    Schema.an.settings       = {label: 'Ascii Name'};
    Schema.aen[0].settings   = {label: 'English Name'};
    Schema.atr[0].settings   = {label: 'Turkish Name'};
    Schema.fc.settings       = {label: 'Feature Code'};
    Schema.cc.settings       = {label: 'Country Code'};
    Schema.p.settings        = {label: 'Population'};

    /**
     * ----------------------------------------------------------------
     * Load Schema
     * ----------------------------------------------------------------
     */

    var LocationSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'System_Locations',
        Options: {
            singular : 'System Location',
            plural   : 'System Locations',
            columns  : ['name', 'asciiname', 'alternate_tr', 'alternate_en'],
            main     : 'name',
            perpage  : 10
        },
        Forms: {
            'filter': ['name', 'asciiname', 'alternate_tr', 'alternate_en', 'uri_code', 'feature_code', 'country_code']
        }
    });

    // plugins
    LocationSchema.plugin(_query);
    LocationSchema.plugin(material);
    
    if(_elastic) {
        LocationSchema.plugin(mongoosastic, {
            host: _elastic.host,
            port: _elastic.port,
            auth: _elastic.auth,
            bulk: {
                delay: 50
            }
        });        
    }

    // indexes
    LocationSchema.index({l: '2d'});
    LocationSchema.index({p: -1});
    LocationSchema.index({aen: 1});
    LocationSchema.index({atr: 1});

    // set auto index
    LocationSchema.set('autoIndex', dot.get(_syncConf, 'locations.autoindex') || false);
    
    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    String.prototype.trToLower = function() {
        var string = this;
        var letters = { "İ": "i", "I": "ı", "Ş": "ş", "Ğ": "ğ", "Ü": "ü", "Ö": "ö", "Ç": "ç" };
        string = string.replace(/(([İIŞĞÜÇÖ]))/g, function(letter){ return letters[letter]; });
        return string.toLowerCase();
    };

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
                utr.push( slug(atr.trToLower(), {separator: '-', mark: false, lang: 'tr'}) );
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

        var self = this;
        if(self._isNew) {}

    });


    var Location = _mongoose.model('System_Locations', LocationSchema);

    /*
     Location.esTruncate(function(err) {

     });
    */

    if(_worker == 0 && _isWorker && _index) {
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

