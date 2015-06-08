var cluster = require('cluster');
var express = require('express');
var load    = require('express-load');
var https   = require('https');
var http    = require('http');
var io      = require('socket.io');

function AppIo(options) {
    this.master = cluster.isMaster;
    this.init(options);
}

AppIo.prototype.init = function (options) {
    this.cores = options.cores || (process.env.NODE_CORES || require('os').cpus().length);
    this.map   = {};
    this.app   = false;

    if (cluster.isMaster)
        return this.fork();

    this.opts   = options;
    this.app    = express();
    this.server = http.createServer(this.app);
    var env     = process.env.NODE_ENV || 'development';
    var port    = process.env.NODE_PORT || 3001;

    if(this.opts.socket)
        this.app.io = io(this.server);

    this.app.set('name', options.name || 'app');
    this.app.set('env', options.env || env);
    this.app.set('port', options.port || port);
    this.app.set('basedir', options.basedir);

    /**
     * @TODO
     * config'e çek
     * https ayarlarını da ekle
     */
    http.globalAgent.maxSockets = 9999;
};

AppIo.prototype.set = function (key, value) {
    return this.app ? this.app.set(key, value) : false;
};

AppIo.prototype.get = function (key) {
    return this.app ? this.app.get(key) : false;
};

AppIo.prototype.fork = function () {
    if (this.master) {
        var self = this;

        function forkWorker(worker_id) {
            var worker = cluster.fork({worker_id: worker_id});
            self.map[worker.id] = worker_id;
        }

        for (var i = 0; i < this.cores; i++) {
            forkWorker(i);
        }

        cluster.on('exit', function (worker, code, signal) {
            var old_worker_id = self.map[worker.id];
            delete self.map[worker.id];
            forkWorker(old_worker_id);
        });
    }
};

AppIo.prototype.external = function (source, options) {
    if ( this.master || ! this.app.get('basedir') )
        return false;

    load(source, {cwd: this.app.get('basedir')}).into(this.app, options || {});
};

AppIo.prototype.load = function (source, options) {
    if ( this.master || ! this.app )
        return false;

    if(Object.prototype.toString.call(options) == '[object Array]') {
        for(o in options) {
            load(source+'/'+options[o], {cwd: __dirname}).into(this.app);
        }

        return;
    }

    load(source, {cwd: __dirname}).into(this.app, options || {});
};

AppIo.prototype.listen = function () {
    if ( this.master || ! this.app )
        return false;

    var self = this;

    load().into(this.app, function(err, instance) {
        if(err)
            throw err;

        // socket route
        if(self.opts.socket) {
            var router = new self.app.lib.router();

            self.app.io.route = function(namespace, route, fn) {
                router.add(namespace, route, fn);
            }
        }

        self.server.listen(self.get('port'), function() {
            self.app.system.logger.info('server listening, port:' + self.get('port'));
        });
    });
};

module.exports = AppIo;






