module.exports = function(app) {

    if(parseInt(process.env.worker_id) != 0)
        return false;

    var _env    = app.get('env');
    var _conf   = app.config[_env].feed;
    var _schema = app.lib.schema;
    var _log    = app.lib.logger;
    var _kue    = app.boot.kue;
    var _group  = 'WORKER:CRON:FEEDS';
    
    if( ! _conf )
        return _log.info(_group, 'feed config not found');
    
    if( ! _conf.enabled )
        return _log.info(_group, 'feed config is not enabled');
    
    new app.boot.cron(_conf.cron.interval, function() {

        new _schema('feed.channels').init(app).stream({}, function(err, stream) {

            stream.on('data', function (doc) {

                var docId = doc._id.toString();
                 _log.info(_group, 'denormalize job, '+docId);

                 _kue.create('feed-channel-parse', {
                    title: 'Feed channel parse',
                    params: {
                        type: 'feed-channel-parse',
                        channel: docId
                    }
                 }).attempts(3).removeOnComplete(true).save();

            }).on('error', function (err) {
                _log.error(_group, err);
            }).on('close', function () {
                _log.info(_group, 'stream finished');
            });

        });
        
    }, null, true); // start: true

};

