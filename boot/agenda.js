var agenda = require('agenda');
var dot    = require('dotty');

module.exports = function(app) {

    var _log = app.system.logger;

    try {
        var instance = new agenda({
            db: {
                address: app.core.mongo.str,
                collection: 'agenda'
            },
            processEvery: '30 seconds'
        });

        function ignoreErrors() {}

        instance._db.ensureIndex("nextRunAt", ignoreErrors)
            .ensureIndex("lockedAt", ignoreErrors)
            .ensureIndex("name", ignoreErrors)
            .ensureIndex("priority", ignoreErrors);

        function graceful() {
            instance.stop(function() {
                process.exit(0);
            });
        }

        process.on('SIGTERM', graceful);
        process.on('SIGINT' , graceful);

        return instance;
    }
    catch(e) {
        _log.error(e.stack);
        return false;
    }

};




