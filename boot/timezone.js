var moment = require('moment-timezone');

module.exports = function(app) {

    var _log   = app.lib.logger;
    var _mdl   = app.middle;
    var _group = 'BOOT:TIMEZONE';

    try {
        var _conf = app.lib.bootConf(app, 'timezone');
        
        app.all('*', function (req, res, next) {
            if( req.session && ! req.session.time && _conf && _conf.default )
                req.session.time = {name: _conf.default};

            req.__time = false;
            
            if(req.session.time) {
                var currTz = moment.tz(req.session.time.name);
                var hours  = currTz.format('Z');
                var mins   = currTz.zone();
                
                req.session.time.hours = hours;
                req.session.time.mins  = mins;
                        
                req.__time = {
                    name  : req.session.time.name,
                    hours : hours,
                    mins  : mins
                }                
            }
            
            next();
        });

        return true;
    }
    catch(e) {
        _log.error(_group, e.stack);
        return false;
    }

};




