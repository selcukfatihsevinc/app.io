var shortId = require('shortid');

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

    /**
     * channel, source ve kategorileri add to set yap
     */
        
    var Schema = {
        // common props
        ap : [{type: ObjectId, ref: 'System_Apps', alias: 'apps'}],
        t  : {type: String, required: true, alias: 'title'},
        ty : {type: String, default: 'R', enum: ['R'], alias: 'type'}, // R: RSS
        ci : [{type: ObjectId, ref: 'Feed_Channels', alias: 'channels'}],
        so : [{type: ObjectId, ref: 'Feed_Sources', alias: 'sources'}],
        ct : [{type: ObjectId, ref: 'Feed_Categories', alias: 'categories'}],
        ie : {type: String, default: 'Y',  enum: ['Y', 'N'], alias: 'is_enabled'},
        sh : {type: String, unique: true, default: shortId.generate, short: true, alias: 'shortid'},
        st : {type: String, index: true, alias: 'shortener'},
        
        // RSS content
        u  : {type: String, unique: true, alias: 'url', pattern: 'url'},
        p  : {type: String, alias: 'permalink', pattern: 'url'},
        s  : {type: String, alias: 'summary'},
        c  : {type: String, alias: 'content'},
        th : {type: String, alias: 'thumbnail', pattern: 'url'},
        pa : {type: Date, alias: 'published_at', default: Date.now},
        ta : [{type: String, alias: 'tags'}],
        te : [{type: String, alias: 'terms'}]
    };

    /**
     * ----------------------------------------------------------------
     * Settings
     * ----------------------------------------------------------------
     */

    Schema.t.settings = {label: 'Title'};

    /**
     * ----------------------------------------------------------------
     * Load Schema
     * ----------------------------------------------------------------
     */

    var ContentSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'Feed_Contents',
        Options: {
            singular : 'Feed Content',
            plural   : 'Feed Contents',
            columns  : ['title'],
            main     : 'title',
            perpage  : 25
        }
    });

    // plugins
    ContentSchema.plugin(_query);

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    ContentSchema.pre('save', function (next) {

        var self = this;
        self._isNew = self.isNew;
        next();

    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    ContentSchema.post('save', function (doc) {

        var self = this;
        if(self._isNew) {}

    });

    return _mongoose.model('Feed_Contents', ContentSchema);

};







