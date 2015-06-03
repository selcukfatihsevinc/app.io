var kue = require('kue');
var _   = require('underscore');
_.s     = require('underscore.string');

module.exports = function(app) {

    var _env    = app.get('env');
    var _log    = app.system.logger;
    var _schema = app.lib.schema;
    var _jobs   = app.boot.kue;

    if( ! app.boot.kue ) {
        _log.error('kue not found (build-index)');
        return false;
    }

    app.boot.kue.process('set-index-job', 5, function(job, done) {

        /**
         * @TODO
         * eğer ids parametresi gelirse {in} sorgusu gönder
         */

        // job params
        var params = job.data.params;
        var o      = params.object;
        var obj    = {};

        new _schema(o).init(app).stream(obj, function(err, stream) {
            _log.info('building object index: '+o);

            stream.on('data', function (doc) {

                _jobs.create('build-index', {
                    title: 'Index '+o+' object',
                    params: {
                        type   : 'build-index',
                        object : o,
                        id     : doc._id,
                    }
                }).attempts(3).save();

            }).on('error', function (err) {
                _log.error('object index error:');
                _log.error(err);
            }).on('close', function () {
                _log.info('object indexing finished: '+o);
                done();
            });
        });

    });

    app.boot.kue.process('build-index', 5, function(job, done) {

        // job params
        var params = job.data.params;
        var o      = params.object;
        var id     = params.id;
        var schema = new _schema(o).init(app);

        schema.getById(id, function(err, doc) {
            if(err)
                return done();

            schema.indexByDoc(doc, function() {
                done();
            });
        });

    });

    // remove completed jobs
    if(parseInt(process.env.worker_id) == 0) {
        app.boot.kue.on('job complete', function(id) {

            kue.Job.get(id, function(err, job) {
                if (err) return;

                // remove job from kue
                job.remove(function(err) {
                    if (err) return;
                    console.log('removed completed job #%d', job.id);
                });
            });

        });
    }

};

