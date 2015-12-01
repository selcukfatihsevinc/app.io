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

    var RoleSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'System_Roles',
        Options: {
            singular : 'System Role',
            plural   : 'System Roles',
            columns  : ['name', 'slug'],
            main     : 'name',
            perpage  : 25,
            nodelete : true
        }
    });

    // plugins
    RoleSchema.plugin(_query);

    // compound index
    RoleSchema.index({ap: 1, n: 1}, {unique: true});
    RoleSchema.index({ap: 1, s: 1}, {unique: true});

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    RoleSchema.pre('save', function (next) {

        var self = this;
        self._isNew = self.isNew;
        next();

    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    RoleSchema.post('save', function (doc) {

        var self = this;
        if(self._isNew) {}

    });

    return _mongoose.model('System_Roles', RoleSchema);

};



