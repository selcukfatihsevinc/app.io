var moment   = require('moment');
var momentTz = require('moment-timezone');
var path     = require('path');
var swig     = require('swig');
var extras   = require('swig-extras');
var _s       = require('underscore.string');
var _        = require('lodash');

// swig extra filters
extras.useFilter(swig, 'split');

// use lodash
function useLodash(swig, filter, string) {
    var obj = string ? _s : _;
    
    if (filter === undefined) {
        return Object.keys(obj).forEach(function(action) {
            if (lodashHas(action, string))
                useLodash(swig, action, string)
        })
    }

    if (Array.isArray(filter)) {
        return filter.forEach(function(f) {
            useLodash(swig, f, string)
        })
    }

    if (lodashHas(filter, string))
        swig.setFilter((string?'s_':'')+filter, obj[filter])
    else
        throw new Error(filter+' is not a lodash function');
}

function lodashHas(functionName, string) {
    var obj = string ? _s : _;
    return (obj[functionName] && typeof obj[functionName] === 'function')
}

useLodash(swig);
useLodash(swig, undefined, true);

swig.setFilter('dateFormat', function(element, format, timezone, locale) {
    if(locale)
        moment.locale(locale);
    
    var parsed;
    if(format == 'fromNow') {
        parsed = moment(element).fromNow();
    }
    else {
        if(timezone && timezone != '')
            parsed = momentTz.tz(new Date(element), timezone).format(format);
        else
            parsed = moment(new Date(element)).format(format);        
    }
    
    if(parsed == 'Invalid date')
        return element;
    
    return parsed;
});

swig.setFilter('trToUpper', function(string) {
    return string.trToUpper();
});

swig.setFilter('numberFormat', function(number, decimals, decimalSeparator, orderSeparator) {
    number = parseInt(number);
    decimals = decimals || 0;
    decimalSeparator = decimalSeparator || '.';
    orderSeparator = orderSeparator || ',';
    
    return _s.numberFormat(number, decimals, decimalSeparator, orderSeparator);
});

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



