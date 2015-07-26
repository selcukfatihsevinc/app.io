var geonames = require('geonames-reader');
var php      = require('phpjs');
var crypto   = require('crypto');
var slug     = require('speakingurl');
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

    var _random = function(len) {
        return crypto.randomBytes(Math.ceil(len/2))
            .toString('hex') // convert to hexadecimal format
            .slice(0,len);   // return required number of characters
    };

    app.get('/admin/import/countries', function(req, res, next) {

        try {
            var Model = _mongoose.model('System_Locations');
            var conf = _conf.locations;
            var file = _base+'/'+conf.base+'/allCountries.txt';
            var i    = 0;
            var d    = [];
            var w    = require(_base+'/'+conf.base+'/weights');

            geonames.read(file, function(feature, cb) {

                i++;
                console.log(i+'. '+feature.name);

                try {
                    d.push({
                        parentId: null,
                        path: '',
                        id: feature.id,
                        n: feature.name,
                        an: feature.asciiname,
                        uri: slug(feature.asciiname.toLowerCase(), {separator: '-', mark: false}),
                        uc: _random(8),
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
                var field, uriField;

                if(iso == 'eng' || iso == 'en') {
                    field    = 'aen';
                    uriField = 'en';
                }
                else if(iso == 'tur' || iso == 'tr') {
                    field    = 'atr';
                    uriField = 'tr';
                }

                if( ! field ) {
                    _log.info(_group+':NOTFOUND:FIELD', field);
                    return cb();
                }

                var obj = {$addToSet: {}};
                obj.$addToSet[field] = feature.alternate_name;

                var _s_obj = {separator: '-', mark: false};
                if(field == 'atr')
                    _s_obj.lang = 'tr';

                obj.$addToSet['u'+uriField] = slug(feature.alternate_name, _s_obj),

                Model.collection.update({id: feature.geoname_id}, obj, function(err, affected) {
                    if(err)
                        return _log.error(_group+':ALTERNATE', err);

                    _log.info(_group+':ALTERNATE:AFFECTED', 1);
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
            var loc  = _mongoose.model('System_Locations');
            var i    = 0;

            geonames.read(file, function(feature, cb) {

                i++;

                (function(loc, feature, i, cb) {
                    loc.findOne({id: feature.child_id}, function(err, child) {
                        if( err || ! child )
                            return cb();

                        loc.findOne({id: feature.parent_id}, function(err, parent) {
                            console.log(i+'. '+child.an);

                            if( err || ! parent )
                                return cb();

                            child.parentId = parent._id;
                            child.save(function(err) {
                                if(err)
                                    _log.error(_group+':HIERARCHY', err);

                                cb();
                            });
                        });

                    });
                })(loc, feature, i, cb);

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


