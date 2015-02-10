var express = require('express');
var path    = require('path');

module.exports = function(app) {

    var _log = app.system.logger;

    try {
        // get config
        var _env  = app.get('env');
        var _conf = app.lib.bootConf(app, 'static');
        var _dir  = path.dirname(__dirname);

        app.use(express.static(_dir+'/'+(_conf.dir || 'public'), (_conf.options || {}) ));
        app.use(express.static(app.get('basedir')+'/'+(_conf.dir || 'public'), (_conf.options || {}) ));
        return true;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




