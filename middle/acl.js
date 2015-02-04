var acl = require('acl');

function Acl(req, res, next) {

    /**
     * @TODO
     * acl middleware
     */

}

module.exports = function(app) {
    var mongoose = app.core.mongo.mongoose;
    app.acl      = new acl( new acl.mongodbBackend(mongoose.connection.db, 'acl_', true) ); // useSingle: true

    return Acl;
};