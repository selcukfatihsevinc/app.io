module.exports = function(app) {

    var _env      = app.get('env');
    var _log      = app.lib.logger;
    var _mongoose = app.core.mongo.mongoose;
    var _query    = app.lib.query;
    var _emitter  = app.lib.schemaEmitter;
    var _helper   = app.lib.utils.helper;
    var _group    = 'MODEL:oauth.clients';

    // types
    var ObjectId  = _mongoose.Schema.Types.ObjectId;
    var Mixed     = _mongoose.Schema.Types.Mixed;

    /**
     * ----------------------------------------------------------------
     * Schema
     * ----------------------------------------------------------------
     */

    var Schema = {
        name         : {type: String, unique: true, alias: 'name'},
        apps         : {type: ObjectId, required: true, ref: 'System_Apps', alias: 'apps'},
        clientId     : {type: String, unique: true, alias: 'clientId'},
        clientSecret : {type: String, index: true, alias: 'clientSecret'},
        redirectUri  : {type: String, required: true, alias: 'redirectUri', pattern: 'url'}
    };

    /**
     * ----------------------------------------------------------------
     * Settings
     * ----------------------------------------------------------------
     */

    Schema.name.settings         = {label: 'Name'};
    Schema.apps.settings         = {label: 'Apps', display: 'name'};
    Schema.clientId.settings     = {label: 'Client Id'};
    Schema.clientSecret.settings = {label: 'Client Secret'};
    Schema.redirectUri.settings  = {label: 'Redirect Uri'};

    /**
     * ----------------------------------------------------------------
     * Load Schema
     * ----------------------------------------------------------------
     */

    var ClientsSchema = app.libpost.model.loader.mongoose(Schema, {
        Name: 'Oauth_Clients',
        Options: {
            singular : 'Client',
            plural   : 'Clients',
            columns  : ['name', 'apps', 'redirectUri', 'clientId', 'clientSecret'],
            main     : 'name',
            perpage  : 25
        }
    });

    // plugins
    ClientsSchema.plugin(_query);

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    ClientsSchema.pre('save', function (next) {

        var self = this;

        if(self.isNew) {
            if( ! self.clientId )
                self.clientId = _helper.random(32);

            if( ! self.clientSecret )
                self.clientSecret = _helper.random(32);
        }

        next();

    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    ClientsSchema.post('save', function (doc) {

        var self = this;
        if(self._isNew) {}

    });

    /**
     * ----------------------------------------------------------------
     * Methods
     * ----------------------------------------------------------------
     */

    ClientsSchema.method('getClient', function(clientId, clientSecret, cb) {
        var Clients = _mongoose.model('Oauth_Clients');
        var params  = {clientId: clientId};

        if (clientSecret != null)
            params.clientSecret = clientSecret;

        Clients.findOne(params, cb);
    });

    ClientsSchema.method('grantTypeAllowed', function(clientId, grantType, cb) {
        var Clients = _mongoose.model('Oauth_Clients');
        cb(false, true);
    });

    return _mongoose.model('Oauth_Clients', ClientsSchema);

};