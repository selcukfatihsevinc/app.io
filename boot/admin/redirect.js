module.exports = function(app) {

    /**
     * @TODO
     * config'e çek
     */

    var _log = app.system.logger;

    try {
        app.all('/admin*', app.middle.basic, function (req, res, next) {
            var segment = res.locals.segments[2];
            var routes  = ['login', 'logout'];

            if( ! req.session.userId && routes.indexOf(segment) == -1)
                return res.redirect('/admin/login');

            next();
        });

        return true;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




