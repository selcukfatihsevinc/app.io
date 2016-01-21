var dot = require('dotty');

function DataBodyUserid(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;
    var _userId = req.body.user_id;
    var _middle = 'middle.data.body.userid';
    
    if( ! _userId || _userId == '' ) {
        return next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['user id not found']
        }));
    }
    
    new _schema('system.users').init(req, res, next).getById(_userId, function(err, doc) {
        if( err || ! doc ) {
            return next( _resp.Unauthorized({
                middleware: _middle,
                type: 'InvalidCredentials',
                errors: ['user data not found']}
            ));
        }
        
        req.__bodyUser     = doc;
        req.__bodyUser._id = doc._id.toString();
        
        next();
    });

}

module.exports = function(app) {
    return DataBodyUserid;
};