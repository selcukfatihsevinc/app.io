module.exports = function(app) {

    /**
     * @TODO
     * routing config'e çekilebilir
     */

    var _log   = app.lib.logger;
    var _mdl   = app.middle;
    var _group = 'BOOT:ADMIN:REDIRECT';

    try {
        app.all('/admin*',
            _mdl.basic,
        function (req, res, next) {
            var segment = res.locals.segments[2];
            var routes  = ['login', 'logout'];

            if( ! req.session.adminUserId && routes.indexOf(segment) == -1)
                return res.redirect('/admin/login');

            next();
        });

        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




