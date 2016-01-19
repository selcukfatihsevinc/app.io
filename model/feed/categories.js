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
        ap : {type: ObjectId, required: true, ref: 'System_Apps', alias: 'apps'},
        n  : {type: String, required: true, alias: 'name'},
        ie : {type: String, default: 'Y', enum: ['Y', 'N'], alias: 'is_enabled'},
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

    var CategorySchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'Feed_Categories',
        Options: {
            singular : 'Feed Category',
            plural   : 'Feed Categories',
            columns  : ['name'],
            main     : 'name',
            perpage  : 25
        }
    });

    // plugins
    CategorySchema.plugin(_query);

    // compound index
    CategorySchema.index({ap: 1, n: 1}, {unique: true});

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    CategorySchema.pre('save', function (next) {

        var self = this;
        self._isNew = self.isNew;
        next();

    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    CategorySchema.post('save', function (doc) {

        var self = this;
        if(self._isNew) {}

    });

    return _mongoose.model('Feed_Categories', CategorySchema);

};



