var kue = require('kue');

module.exports = function(app) {

    var _env      = app.get('env');
    var _log      = app.lib.logger;
    var _schema   = app.lib.schema;
    var _jobs     = app.boot.kue;
    var _mongoose = app.core.mongo.mongoose;
    var _group    = 'WORKER:RANDOMIZE';

    if( ! app.boot.kue ) {
        _log.info(_group, 'kue not found');
        return false;
    }

    app.boot.kue.process('randomize-document', 1, function(job, done) {

        var params = job.data.params;
        var Model  = _mongoose.model(params.model);

        Model.findOne({_id: params.id}, function(err, doc) {
            _log.info(_group+':'+params.model, doc._id);

            doc.r = Math.random();
            doc.save(function(err) {
                if(err)
                    _log.error(err);

                done();
            });
        });

    });

};

