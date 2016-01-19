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
        t  : {type: String, required: true, alias: 'term'},
        f  : {type: Number, alias: 'freq'},
        co : {type: ObjectId, ref: 'Feed_Contents', alias: 'contents'},
        ci : {type: ObjectId, ref: 'Feed_Channels', alias: 'channels'},
        so : {type: ObjectId, ref: 'Feed_Sources', alias: 'sources'},
        ca : {type: Date, alias: 'created_at', default: Date.now}
    };

    /**
     * ----------------------------------------------------------------
     * Settings
     * ----------------------------------------------------------------
     */

    Schema.t.settings = {label: 'Term'};

    /**
     * ----------------------------------------------------------------
     * Load Schema
     * ----------------------------------------------------------------
     */

    var KeywordSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'Feed_Keywords',
        Options: {
            singular : 'Feed Keyword',
            plural   : 'Feed Keywords',
            columns  : ['term'],
            main     : 'term',
            perpage  : 25
        }
    });

    // plugins
    KeywordSchema.plugin(_query);

    // compound index
    KeywordSchema.index({t: 1, co: 1}, {unique: true});

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    KeywordSchema.pre('save', function (next) {

        var self = this;
        self._isNew = self.isNew;
        next();

    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    KeywordSchema.post('save', function (doc) {

        var self = this;
        if(self._isNew) {}

    });

    return _mongoose.model('Feed_Keywords', KeywordSchema);

};






