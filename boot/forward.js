module.exports = function(app) {

    var _log   = app.lib.logger;
    var _env   = app.get('env');
    var _group = 'BOOT:FORWARD';

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
        _log.error(_group, e.stack);
        return false;
    }

};




