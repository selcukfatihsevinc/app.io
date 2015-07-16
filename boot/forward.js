
module.exports = function(app) {

    var _log = app.system.logger;
    var _env = app.get('env');

    try {
        var _conf = app.lib.bootConf(app, 'forward');

        function forwards(req, res, next) {
            if(_conf[req.hostname])
                req.url = '/'+_conf[req.hostname]+req.url;

            next('route');
        }

        app.get('*', forwards);
        app.post('*', forwards);

        return true;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




