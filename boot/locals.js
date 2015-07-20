module.exports = function(app) {

    var _log = app.system.logger;

    try {
        var _env = app.get('env');

        app.use(function(req, res, next) {
            res.locals.req = req;
            res.locals.res = res;
            res.locals.segments = req.url.split('/');
            res.locals.config = app.config[_env];
            res.locals.now = Date.now();

            if(app.boot.session)
                res.locals.session = req.session;

            if(app.boot.flash)
                res.locals.flash = req.flash('flash');

            next();
        });

        return true;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




