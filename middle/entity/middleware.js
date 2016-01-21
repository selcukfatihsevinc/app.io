var dot = require('dotty');

function EntityMiddleware(req, res, next) {

    var _app     = req.app;
    var _mdl     = _app.middle;
    var _resp    = _app.system.response.app;
    var _field   = req.params.field;
    var _entity  = req.__entityAcl;
    var _errType = 'EntityApiError';
    var _middle  = 'middle.entity.middleware';
    
    if( ! _entity.acl )
        return next();
    
    // check acl middleware
    var _slug = req.__appData.slug;
    var _func = dot.get(_mdl, _slug+'.entity.'+_field);
   
    if( ! _func ) {
        return next( _resp.NotFound({
            middleware: _middle,
            type: _errType,
            errors: ['entity middleware not found']
        }));    
    }

    // load acl middleware
    new _func(req, res, next);
    
}

module.exports = function(app) {
    return EntityMiddleware;
};