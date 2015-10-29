module.exports = function(app) {

    var _env      = app.get('env');
    var _log      = app.lib.logger;
    var _mongoose = app.core.mongo.mongoose;
    var _group    = 'MODEL:oauth.accesstokens';

    var Schema = {
        accessToken : {type: String, required: true, unique: true, alias: 'accessToken'},
        clientId    : {type: String, alias: 'clientId'},
        userId      : {type: String, required: true, alias: 'userId'},
        expires     : {type: Date, alias: 'expires'}
    };

    var AccessTokensSchema = app.core.mongo.db.Schema(Schema);

    // statics
    AccessTokensSchema.method('getAccessToken', function(bearerToken, cb) {
        var AccessTokens = _mongoose.model('Oauth_AccessTokens');
        AccessTokens.findOne({accessToken: bearerToken}, cb);
    });

    AccessTokensSchema.method('saveAccessToken', function(token, clientId, expires, userId, cb) {
        var AccessTokens = _mongoose.model('Oauth_AccessTokens');

        if (userId.id)
            userId = userId.id;

        var fields = {
            clientId : clientId,
            userId   : userId,
            expires  : expires
        };

        AccessTokens.update({accessToken: token}, fields, {upsert: true}, function(err) {
            if (err)
                _log.error(_group, err);

            cb(err);
        });
    });

    return _mongoose.model('Oauth_AccessTokens', AccessTokensSchema);

};