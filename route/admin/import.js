var geonames = require('geonames-reader');
var php      = require('phpjs');
var dot      = require('dotty');
var _        = require('underscore');

module.exports = function(app) {

    var _env    = app.get('env');
    var _base   = app.get('basedir');
    var _log    = app.system.logger;
    var _form   = app.lib.form;
    var _schema = app.lib.schema;
    var _conf   = app.config[_env];
    var _jobs   = app.boot.kue;
    var _group  = 'ROUTE:ADMIN:IMPORT';

    app.get('/admin/import/countries', function(req, res, next) {
        try {
            var conf = _conf.locations;
            var file = _base+'/'+conf.base+'/allCountries.txt';
            var i    = 1;

            geonames.read(file, function(feature, cb) {

                console.log(i+'. '+feature.name);
                i++;

                var loc = new _schema('system.locations').init(app).post({
                    import_id: feature.id,
                    name: feature.name,
                    asciiname: feature.asciiname,
                    sortname: feature.asciiname.toLowerCase(),
                    location: [feature.longitude, feature.latitude],
                    feature_code: feature.feature_code,
                    population: feature.population
                }, function(err, doc) {
                    if(err)
                        _log.error(_group+':IMPORT-COUNTRIES', err);

                    cb();
                });

                return;

                /*
                _jobs.create('import-countries', {
                    params: {
                        id: feature.id,
                        name: feature.name,
                        asciiname: feature.asciiname,
                        longitude: feature.longitude,
                        latitude: feature.latitude,
                        feature_code: feature.feature_code,
                        population: feature.population
                    }
                }).attempts(3).removeOnComplete(true).save();

                cb();
                */

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
            var conf = _conf.locations;
            var file = _base+'/'+conf.base+'/alternateNames.txt';

            /**
             * @TODO
             * parametre olarak optional dil al, eğer yoksa config'de belirtilen dilleri import et, varsa sadece o dili import et
             * import edilecek diller dışındakileri kuyruğa atma
             */

            geonames.read(file, function(feature, cb) {
                _jobs.create('import-alternate', {
                    params: {
                        geoname_id: feature.geoname_id,
                        isolanguage: feature.isolanguage,
                        alternate_name: feature.alternate_name
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


