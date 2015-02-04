module.exports = function(app) {

    var mongoose  = app.core.mongo.mongoose;
    var ObjectId  = mongoose.Schema.Types.ObjectId;
    var Inspector = app.lib.inspector;
    var query     = app.lib.query;

    var Schema = {
        _bucketname : {type: String, index: 1},
        key         : {type: String, index: 1}
    };

    var ResourceSchema = app.core.mongo.db.Schema(Schema);

    return mongoose.model('Acl_Resources', ResourceSchema);

};



