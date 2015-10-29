module.exports = function(app) {

    var _env      = app.get('env');
    var _log      = app.lib.logger;
    var _mongoose = app.core.mongo.mongoose;
    var _group    = 'MODEL:oauth.authcodes';

    var Schema = {
        authCode : {type: String, required: true, unique: true, alias: 'authCode'},
        clientId : {type: String, alias: 'clientId'},
        userId   : {type: String, required: true, alias: 'userId'},
        expires  : {type: Date, alias: 'expires'}
    };

    var AuthCodesSchema = app.core.mongo.db.Schema(Schema);

    // statics
    AuthCodesSchema.method('getAuthCode', function(authCode, cb) {
        var AuthCodes = _mongoose.model('Oauth_AuthCodes');
        AuthCodes.findOne({authCode: authCode}, cb);
    });

    AuthCodesSchema.method('saveAuthCode', function(code, clientId, expires, userId, cb) {
        var AuthCodes = _mongoose.model('Oauth_AuthCodes');

        if (userId.id)
            userId = userId.id;

        var fields = {
            clientId : clientId,
            userId   : userId,
            expires  : expires
        };

        AuthCodes.update({authCode: code}, fields, {upsert: true}, function(err) {
            if (err)
                _log.error(_group, err);

            cb(err);
        });

    });

    return _mongoose.model('Oauth_AuthCodes', AuthCodesSchema);

};