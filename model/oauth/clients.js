var crypto = require('crypto');

module.exports = function(app) {

    var _log      = app.system.logger;
    var mongoose  = app.core.mongo.mongoose;
    var ObjectId  = mongoose.Schema.Types.ObjectId;
    var Inspector = app.lib.inspector;
    var query     = app.lib.query;
    var workerId  = parseInt(process.env.worker_id);

    var random = function(len) {
        return crypto.randomBytes(Math.ceil(len/2))
            .toString('hex') // convert to hexadecimal format
            .slice(0,len);   // return required number of characters
    };

    var Schema = {
        name         : {type: String, unique: true, alias: 'name'},
        apps         : {type: ObjectId, required: true, ref: 'System_Apps', alias: 'apps'},
        clientId     : {type: String, unique: true, alias: 'clientId'},
        clientSecret : {type: String, index: true, alias: 'clientSecret'},
        redirectUri  : {type: String, required: true, alias: 'redirectUri', pattern: 'url'}
    };

    Schema.name.settings = {
        label: 'Name'
    };

    Schema.apps.settings = {
        label: 'Apps',
        display: 'name'
    };

    Schema.clientId.settings = {
        label: 'Client Id',
        initial: false
    };

    Schema.clientSecret.settings = {
        label: 'Client Secret',
        initial: false
    };

    Schema.redirectUri.settings = {
        label: 'Redirect Uri'
    };

    var inspector     = new Inspector(Schema).init();
    var ClientsSchema = app.core.mongo.db.Schema(Schema);

    // plugins
    ClientsSchema.plugin(query);

    // inspector
    ClientsSchema.inspector = inspector;

    // model options
    ClientsSchema.inspector.Options = {
        singular : 'Client',
        plural   : 'Clients',
        columns  : ['name', 'apps', 'redirectUri', 'clientId', 'clientSecret'],
        main     : 'name',
        perpage  : 25
    };

    // statics
    ClientsSchema.method('getClient', function(clientId, clientSecret, cb) {
        var Clients = mongoose.model('Oauth_Clients');
        var params  = {clientId: clientId};

        if (clientSecret != null)
            params.clientSecret = clientSecret;

        Clients.findOne(params, cb);
    });

    ClientsSchema.method('grantTypeAllowed', function(clientId, grantType, cb) {
        var Clients = mongoose.model('Oauth_Clients');
        cb(false, true);
    });

    // generate clientID and clientSecret
    ClientsSchema.pre('save', function (next) {
        var self = this;

        if(self.isNew) {
            self.clientId     = random(32);
            self.clientSecret = random(32);
        }

        next();
    });

    // allow superadmin (mongoose connection bekliyor)
    mongoose.connection.on('open', function() {
        if(app.acl && workerId == 0) {
            app.acl.allow('superadmin', 'oauth_clients', '*');
            _log.info('[acl:allow] superadmin:oauth_clients:*');
        }
    });

    return mongoose.model('Oauth_Clients', ClientsSchema);

};