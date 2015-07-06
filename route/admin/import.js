var geonames = require('geonames-reader');
var php      = require('phpjs');
var dot      = require('dotty');
var _        = require('underscore');

module.exports = function(app) {

    var _env      = app.get('env');
    var _base     = app.get('basedir');
    var _log      = app.system.logger;
    var _form     = app.lib.form;
    var _schema   = app.lib.schema;
    var _conf     = app.config[_env];
    var _jobs     = app.boot.kue;
    var _mongoose = app.core.mongo.mongoose;
    var _group    = 'ROUTE:ADMIN:IMPORT';

    app.get('/admin/import/countries', function(req, res, next) {

        try {
            var Model = _mongoose.model('System_Locations');
            var conf = _conf.locations;
            var file = _base+'/'+conf.base+'/allCountries.txt';
            var i    = 0;
            var d    = [];

            geonames.read(file, function(feature, cb) {

                i++;
                console.log(i+'. '+feature.name);

                try {
                    d.push({
                        id: feature.id,
                        n: feature.name,
                        an: feature.asciiname,
                        sn: feature.asciiname.toLowerCase(),
                        l: [feature.longitude, feature.latitude],
                        fcl: feature.feature_class,
                        fc: feature.feature_code,
                        cc: feature.country_code,
                        p: feature.population
                    });

                    if(d.length == 100) {
                        Model.collection.insert(_.clone(d), function(err, docs) {
                            if(err)
                                _log.error(_group+':COUNTRIES', err);

                            _log.info(_group+':COUNTRIES:DOCS', docs.length);
                        });

                        cb();
                        d = [];
                    }
                    else
                        cb();
                }
                catch(e) {
                    _log.error(e);
                    cb();
                }

            }, function(err) {
                console.log('All done!');
            });

            res.json({});
        }
        catch(e) {
            _log.error(e);
            res.end();
        }
    });

    app.get('/admin/import/alternate', function(req, res, next) {
        try {
            var Model = _mongoose.model('System_Locations');
            var conf  = _conf.locations;
            var file  = _base+'/'+conf.base+'/alternateNames.txt';
            var i     = 0;

            geonames.read(file, function(feature, cb) {

                i++;
                console.log(i+'. '+feature.isolanguage+'::'+feature.alternate_name);

                var iso = feature.isolanguage;
                var field;

                if(iso == 'eng' || iso == 'en')
                    field = 'aen';
                else if(iso == 'tur' || iso == 'tr')
                    field = 'atr';

                if( ! field ) {
                    _log.info(_group+':NOTFOUND:FIELD', field);
                    return cb();
                }

                var obj = {$set: {}};
                obj.$set[field] = feature.alternate_name;

                Model.collection.update({id: feature.geoname_id}, obj, function(err, affected) {
                    if(err)
                        _log.error(_group+':ALTERNATE', err);

                    _log.info(_group+':ALTERNATE:AFFECTED', affected);
                });

                cb();

            }, function(err) {
                console.log('All done!');
            });

            res.json({});
        }
        catch(e) {
            _log.error(e);
            res.end();
        }
    });

    app.get('/admin/import/hierarchy', function(req, res, next) {
        try {
            var conf = _conf.locations;
            var file = _base+'/'+conf.base+'/hierarchy.txt';

            geonames.read(file, function(feature, cb) {
                _jobs.create('import-hierarchy', {
                    params: {
                        parent_id: feature.parent_id,
                        child_id: feature.child_id
                    }
                }).attempts(3).removeOnComplete(true).save();

                cb();
            }, function(err) {
                console.log('All done!');
            });

            res.json({});
        }
        catch(e) {
            _log.error(e);
            res.end();
        }
    });

};


