var kue = require('kue');
var _   = require('underscore');
_.s     = require('underscore.string');

module.exports = function(app) {

    var _env    = app.get('env');
    var _log    = app.lib.logger;
    var _schema = app.lib.schema;
    var _jobs   = app.boot.kue;
    var _group  = 'WORKER:IMPORT-ALTERNATE';

    if( ! app.boot.kue ) {
        _log.info(_group, 'kue not found');
        return false;
    }

    app.boot.kue.process('import-alternate', 2, function(job, done) {

        // job params
        var params = job.data.params;

        // get location by import id
        new _schema('system.locations').init(app).get({import_id: params.geoname_id, qt: 'one'}, function(err, doc) {
            if(err) {
                _log.error(_group, err);
                return done();
            }

            if( ! doc ) {
                _log.info(_group+':NOTFOUND:LOCATION', doc);
                return done();
            }

            var field;

            if(params.isolanguage == 'eng' || params.isolanguage == 'en')
                field = 'alternate_en';

            if(params.isolanguage == 'tur' || params.isolanguage == 'tr')
                field = 'alternate_tr';

            if( ! field ) {
                _log.info(_group+':NOTFOUND:FIELD', field);
                return done();
            }

            var obj = {};
            obj[field] = params.alternate_name;

            new _schema('system.locations').init(app).put(doc._id.toString(), obj, function(err, affected) {
                _log.info(_group+':AFFECTED', affected);
                done();
            });
        });

    });

};

