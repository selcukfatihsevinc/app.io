module.exports = function(app) {

    var _log      = app.system.logger;
    var mongoose  = app.core.mongo.mongoose;
    var ObjectId  = mongoose.Schema.Types.ObjectId;
    var Inspector = app.lib.inspector;
    var query     = app.lib.query;

    var Schema = {
        authCode : {type: String, required: true, unique: true, alias: 'authCode'},
        clientId : {type: String, alias: 'clientId'},
        userId   : {type: String, required: true, alias: 'userId'},
        expires  : {type: Date, alias: 'expires'}
    };

    var AuthCodesSchema = app.core.mongo.db.Schema(Schema);

    // statics
    AuthCodesSchema.method('getAuthCode', function(authCode, cb) {
        var AuthCodes = mongoose.model('Oauth_AuthCodes');
        AuthCodes.findOne({authCode: authCode}, cb);
    });

    AuthCodesSchema.method('saveAuthCode', function(code, clientId, expires, userId, cb) {
        var AuthCodes = mongoose.model('Oauth_AuthCodes');

        if (userId.id)
            userId = userId.id;

        var fields = {
            clientId : clientId,
            userId   : userId,
            expires  : expires
        };

        AuthCodes.update({authCode: code}, fields, {upsert: true}, function(err) {
            if (err) _log.error(err);
            cb(err);
        });

    });

    return mongoose.model('Oauth_AuthCodes', AuthCodesSchema);

};