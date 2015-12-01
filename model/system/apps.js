var php = require('phpjs');
var _   = require('underscore');

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
        n : {type: String, required: true, alias: 'name', unique: true},
        s : {type: String, required: true, alias: 'slug', unique: true},
        l : {type: String, required: true, alias: 'long', unique: true}
    };

    /**
     * ----------------------------------------------------------------
     * Settings
     * ----------------------------------------------------------------
     */

    Schema.n.settings = {label: 'Name'};
    Schema.s.settings = {label: 'Slug'};
    Schema.l.settings = {label: 'Long Name'};

    /**
     * ----------------------------------------------------------------
     * Load Schema
     * ----------------------------------------------------------------
     */

    var AppsSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'System_Apps',
        Options: {
            singular : 'System App',
            plural   : 'System Apps',
            columns  : ['name', 'slug', 'long'],
            main     : 'name',
            perpage  : 10
        }
    });

    // plugins
    AppsSchema.plugin(_query);

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    AppsSchema.pre('save', function (next) {

        var self    = this;
        self._isNew = self.isNew;
        next();

    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    AppsSchema.post('save', function (doc) {

        var self = this;
        if(self._isNew) {}

    });

    return _mongoose.model('System_Apps', AppsSchema);

};



