var acl   = require('acl');
var async = require('async');

function Acl(req, res, next) {

    var _app  = req.app;
    var _log  = _app.system.logger;
    var _resp = _app.system.response.app;

    // acl middleware'inden sonra object route'una düşünce bunu sorgu parametresi olarak kabul etmemesi için siliyoruz
    if(_app.oauth)
        delete req.query.access_token;

    var user = req.user ? req.user.id : false;

    if(user) {
        var id     = req.params.id;
        var object = req.params.object.replace('.', '_'); // acl sisteminde object isimleri "." yerine "_" ile tutulduğu için değiştiriyoruz
        var method = req.method.toLowerCase();

        var a = {};

        // başka kontroller async olarak yapılmak istenirse buraya ekleyeceğiz

        /*
        a[method] = function(cb) {
            _app.acl.isAllowed(user, object, method, function(err, res) {
                cb(err, res);
            });
        };
        */

        /**
         * is allowed yerine resource üzerinde hangi action'ları olduğu listesinden kontrol yapılacak
         * owner protection olduğu halde master izni varsa burada set edilecek
         */

        _app.acl.allowedPermissions(user, [object], function(err, results) {
            _log.info('user '+user+' acl result:');
            _log.info(results);

            if( err || ! results[object] )
                return next( _resp.Forbidden() );

            if(results[object].indexOf(method) == -1)
                return next( _resp.Forbidden() );

            if(results[object].indexOf(method+'*') != -1)
                req.methodMaster = true;

            next();
        });

        /*
        async.parallel(a, function(err, results) {
            _log.info('user '+user+' acl result:');
            _log.info(results);

            // eğer hata olduysa veya result'lardan biri false geldiyse forbidden gönder
            (err || ! results[method]) ? next( _resp.Forbidden() ) : next();
        });
        */
    }
    else
        next( _resp.Forbidden() );

}

module.exports = function(app) {

    // get mongoose
    var mongoose = app.core.mongo.mongoose;

    // set app acl
    app.acl = new acl( new acl.mongodbBackend(mongoose.connection.db, 'acl_', true) ); // useSingle: true

    return Acl;
};