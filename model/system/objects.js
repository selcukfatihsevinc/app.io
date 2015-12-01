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
        s  : {type: String, required: true, alias: 'slug'}
    };

    /**
     * ----------------------------------------------------------------
     * Settings
     * ----------------------------------------------------------------
     */

    Schema.n.settings = {label: 'Name'};
    Schema.s.settings = {label: 'Slug'};

    /**
     * ----------------------------------------------------------------
     * Load Schema
     * ----------------------------------------------------------------
     */

    var ObjectSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'System_Objects',
        Options: {
            singular : 'System Object',
            plural   : 'System Objects',
            columns  : ['name', 'slug'],
            main     : 'name',
            perpage  : 25,
            nocreate : true,
            nodelete : true,
            noedit   : true
        }
    });

    // plugins
    ObjectSchema.plugin(_query);

    // compound index
    ObjectSchema.index({ap: 1, n: 1}, {unique: true});
    ObjectSchema.index({ap: 1, s: 1}, {unique: true});

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    ObjectSchema.pre('save', function (next) {

        var self = this;
        self._isNew = self.isNew;
        next();

    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    ObjectSchema.post('save', function (doc) {

        var self = this;
        if(self._isNew) {}

    });

    return _mongoose.model('System_Objects', ObjectSchema);

};



