var kue = require('kue');
var _   = require('underscore');
_.s     = require('underscore.string');

module.exports = function(app) {

    var _env    = app.get('env');
    var _log    = app.lib.logger;
    var _schema = app.lib.schema;
    var _jobs   = app.boot.kue;
    var _group  = 'WORKER:IMPORT-COUNTRIES';

    if( ! app.boot.kue ) {
        _log.info(_group, 'kue not found');
        return false;
    }

    app.boot.kue.process('import-countries', 5, function(job, done) {

        // job params
        var params = job.data.params;

        var loc = new _schema('system.locations').init(app).post({
            import_id: params.id,
            name: params.name,
            asciiname: params.asciiname,
            sortname: params.asciiname.toLowerCase(),
            location: [params.longitude, params.latitude],
            feature_code: params.feature_code,
            population: params.population
        }, function(err, doc) {
            if(err)
                _log.error(_group, err);

            done();
        });

    });

};

