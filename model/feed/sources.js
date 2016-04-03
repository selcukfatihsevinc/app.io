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
        u  : {type: String, alias: 'url', pattern: 'url'},
        ie : {type: String, default: 'Y', enum: ['Y', 'N'], alias: 'is_enabled'},
        ca : {type: Date, alias: 'created_at', default: Date.now}        
    };


    /**
     * ----------------------------------------------------------------
     * Settings
     * ----------------------------------------------------------------
     */

    Schema.n.settings = {label: 'Name'};
    Schema.u.settings = {label: 'Url'};
    
    /**
     * ----------------------------------------------------------------
     * Load Schema
     * ----------------------------------------------------------------
     */

    var SourceSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'Feed_Sources',
        Options: {
            singular : 'Feed Source',
            plural   : 'Feed Sources',
            columns  : ['name'],
            main     : 'name',
            perpage  : 25
        }
    });

    // plugins
    SourceSchema.plugin(_query);

    // compound index
    SourceSchema.index({ap: 1, n: 1}, {unique: true});

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    SourceSchema.pre('save', function (next) {

        var self = this;
        self._isNew = self.isNew;
        next();

    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    SourceSchema.post('save', function (doc) {

        var self = this;
        if(self._isNew) {}

    });

    return _mongoose.model('Feed_Sources', SourceSchema);

};



