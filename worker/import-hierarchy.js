var kue = require('kue');
var _   = require('underscore');
_.s     = require('underscore.string');

module.exports = function(app) {

    var _env    = app.get('env');
    var _log    = app.lib.logger;
    var _schema = app.lib.schema;
    var _jobs   = app.boot.kue;
    var _group  = 'WORKER:IMPORT-HIERARCHY';

    if( ! app.boot.kue ) {
        _log.info(_group, 'kue not found');
        return false;
    }

    app.boot.kue.process('import-hierarchy', 2, function(job, done) {

        // job params
        var params = job.data.params;
        var ids    = params.parent_id+','+params.child_id;

        // get location by import id
        new _schema('system.locations').init(app).get({import_id: '{in}'+ids}, function(err, docs) {
            if(err) {
                _log.error(_group, err);
                return done();
            }

            if( ! docs.length ) {
                _log.info(_group+':NOTFOUND:LOCATION', docs);
                return done();
            }

            // mongo id'lerini al
            // child document'e parent id vererek update et

            /*
            new _schema('system.locations').init(app).put(doc._id.toString(), obj, function(err, affected) {
                _log.info(_group+':AFFECTED', affected);
                done();
            });
            */

        });

    });

};
