var kue = require('kue');

module.exports = function(app) {

    var _env      = app.get('env');
    var _log      = app.lib.logger;
    var _schema   = app.lib.schema;
    var _jobs     = app.boot.kue;
    var _group    = 'WORKER:FEEDS';

    if( ! app.boot.kue ) {
        _log.info(_group, 'kue not found');
        return false;
    }

    app.boot.kue.process('feed-channel-parse', 1, function(job, done) {

        var params = job.data.params;
        new app.lib.feedparser(app).run(params.channel, done);

    });

};

