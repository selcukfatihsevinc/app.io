module.exports = function(app) {

    var _mongoose = app.core.mongo.mongoose;

    var Schema = {
        _bucketname : {type: String, index: 1},
        key         : {type: String, index: 1}
    };

    var ResourceSchema = app.core.mongo.db.Schema(Schema);

    return _mongoose.model('Acl_Resources', ResourceSchema);

};



