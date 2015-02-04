module.exports = function(app) {

    var _log      = app.system.logger;
    var mongoose  = app.core.mongo.mongoose;
    var ObjectId  = mongoose.Schema.Types.ObjectId;
    var Inspector = app.lib.inspector;
    var query     = app.lib.query;

    var Schema = {
        accessToken : {type: String, required: true, unique: true, alias: 'accessToken'},
        clientId    : {type: String, alias: 'clientId'},
        userId      : {type: String, required: true, alias: 'userId'},
        expires     : {type: Date, alias: 'expires'}
    };

    var AccessTokensSchema = app.core.mongo.db.Schema(Schema);

    // statics
    AccessTokensSchema.method('getAccessToken', function(bearerToken, cb) {
        var AccessTokens = mongoose.model('Oauth_AccessTokens');
        AccessTokens.findOne({accessToken: bearerToken}, cb);
    });

    AccessTokensSchema.method('saveAccessToken', function(token, clientId, expires, userId, cb) {
        var AccessTokens = mongoose.model('Oauth_AccessTokens');

        if (userId.id)
            userId = userId.id;

        var fields = {
            clientId : clientId,
            userId   : userId,
            expires  : expires
        };

        AccessTokens.update({accessToken: token}, fields, {upsert: true}, function(err) {
            if (err) _log.error(err);
            cb(err);
        });
    });

    return mongoose.model('Oauth_AccessTokens', AccessTokensSchema);

};