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
        ap : {type: ObjectId, required: true, ref: 'System_Apps', alias: 'apps'},
        u  : {type: ObjectId, required: true, ref: 'System_Users', alias: 'users'},
        n  : {type: String, required: true, alias: 'name'},
        o  : {type: String, required: true, alias: 'object'},
        f  : {type: String, required: true, alias: 'filter'}
    };

    /**
     * ----------------------------------------------------------------
     * Settings
     * ----------------------------------------------------------------
     */

    Schema.n.settings = {label: 'Name'};
    Schema.o.settings = {label: 'Object'};
    Schema.f.settings = {label: 'Filter'};

    /**
     * ----------------------------------------------------------------
     * Load Schema
     * ----------------------------------------------------------------
     */

    var FilterSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'System_Filters',
        Options: {
            singular : 'System Filter',
            plural   : 'System Filters',
            columns  : ['name', 'object'],
            main     : 'name',
            perpage  : 25
        }
    });

    // plugins
    FilterSchema.plugin(_query);

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    FilterSchema.pre('save', function (next) {

        var self    = this;
        self._isNew = self.isNew;
        next();

    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    FilterSchema.post('save', function (doc) {

        var self = this;
        if(self._isNew) {}

    });

    return _mongoose.model('System_Filters', FilterSchema);

};



