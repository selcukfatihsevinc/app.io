var path   = require('path');
var swig   = require('swig');
var extras = require('swig-extras');
var _      = require('lodash');

// swig extra filters
extras.useFilter(swig, 'split');

// use lodash
function useLodash(swig, filter) {
    if (filter === undefined) {
        return Object.keys(_).forEach(function(action) {
            if (lodashHas(action))
                useLodash(swig, action)
        })
    }

    if (Array.isArray(filter)) {
        return filter.forEach(function(f) {
            useLodash(swig, f)
        })
    }

    if (lodashHas(filter))
        swig.setFilter(filter, _[filter])
    else
        throw new Error(filter+' is not a lodash function');
}

function lodashHas(functionName) {
    return (_[functionName] && typeof _[functionName] === 'function')
}

useLodash(swig);

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _group = 'BOOT:VIEW';

    try {
        // get config
        var _env  = app.get('env');
        var _conf = app.lib.bootConf(app, 'view');
        var _dir  = path.dirname(__dirname);

        // view
        app.engine('html', swig.renderFile);
        app.set('view engine', 'html');

        // set both app view and app.io folders
        app.set('views', [
            app.get('basedir')+'/'+(_conf.dir || 'view'),
            _dir+'/'+(_conf.dir || 'view')
        ]);

        app.set('view cache', _env == 'production');
        swig.setDefaults(_conf.swig || {});

        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};



