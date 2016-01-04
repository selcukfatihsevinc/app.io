module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'UNCAUGHT:EXCEPTION';

    process.on('uncaughtException', function (err) {
        _log.error(_group, err);
    });

};




