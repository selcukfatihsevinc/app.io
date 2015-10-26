var cluster = require('cluster');
var express = require('express');
var load    = require('express-load');
var https   = require('https');
var http    = require('http');
var io      = require('socket.io');

function AppIo(options) {
    options      = options || {};
    this._opts   = options;
    this._master = cluster.isMaster;
    this._cores  = options.cores || (process.env.NODE_CORES || require('os').cpus().length);
    this._map    = {};
    this._app    = false;

    if (cluster.isMaster) {
        this.fork();
        return this;
    }

    this._app    = express();
    this._server = http.createServer(this._app);
    var env      = process.env.NODE_ENV || 'development';
    var port     = process.env.NODE_PORT || 3001;

    // app variables
    this._app.set('name', this._opts.name || 'app');
    this._app.set('env', this._opts.env || env);
    this._app.set('port', this._opts.port || port);
    this._app.set('basedir', this._opts.basedir);
    this._app.set('isworker', false);

    // other options
    this._opts.core     = this._opts.core || ['mongo', 'redis'];
    this._opts.tz       = this._opts.tz || 'UTC';
    this._opts.external = this._opts.external || {};

    // set process variables
    process.env.TZ = this._opts.tz;

    /**
     * @TODO
     * config'e çek
     * https ayarlarını da ekle
     */
    http.globalAgent.maxSockets = 9999;

    return this;
}

AppIo.prototype.run = function () {
    if (this._master)
        return;

    if(this._opts.socket)
        this._app.io = io(this._server);

    // base boot files
    var boot = 'view|compress|static|body|cookie|session|flash|favicon|locals|config|admin/redirect|x-powered-by|cron|cors|kue|kue-ui|passport';

    // load basic system
    this.external('config/'+this._app.get('env'));
    this.external('apidocs');
    this.load('system/logger');
    this.load('lib/logger');
    this.load('core', this._opts.core);
    this.load('lib');
    this.external('lib', this._opts.external.lib || []);
    this.load('libpost');
    this.external('libpost', this._opts.external.libpost || []);
    this.load('model', ['acl', 'oauth', 'system']);
    this.external('model', this._opts.external.model || []);
    this.load('middle');
    this.load('boot', boot.split('|'));
    this.load('boot', (this._opts.boot && this.type(this._opts.boot) == '[object String]')  ? this._opts.boot.split('|') : []);
    this.external('boot', (this._opts.external.boot && this.type(this._opts.external.boot) == '[object String]')  ? this._opts.external.boot.split('|') : []);
    this.load('system/response/app'); // before routes
    this.external('route', this._opts.external.route || []);
    this.load('route');
    if( this._opts.resize) this.load('boot/resize'); // image resize middlware routes
    this.load('system/handler/app'); // after routes
    this.load('sync/data');
    this.listen();
};

AppIo.prototype.workers = function () {
    if (this._master)
        return;

    // base boot files
    var boot = 'cron|kue';

    this._app.set('isworker', true);

    this.external('config/'+this._app.get('env'));
    this.load('system/logger');
    this.load('lib/logger');
    this.load('core', this._opts.core);
    this.load('lib');
    this.external('lib', this._opts.external.lib || []);
    this.load('libpost');
    this.external('libpost', this._opts.external.libpost || []);
    this.load('model', ['acl', 'oauth', 'system']);
    this.external('model', this._opts.external.model || []);
    this.load('middle');
    this.load('boot', boot.split('|'));
    this.load('boot', (this._opts.boot && this.type(this._opts.boot) == '[object String]')  ? this._opts.boot.split('|') : []);
    this.external('boot', this._opts.external.boot || []);
    this.load('worker');
    this.external('worker', this._opts.external.worker || []);

    var self = this;

    load().into(this._app, function(err, instance) {
        if(err)
            throw err;

        self._app.lib.logger.appio('APP.IO', 'worker initialized');
    });
}

AppIo.prototype.type = function (key) {
    return Object.prototype.toString.call(key);
};

AppIo.prototype.set = function (key, value) {
    return this._app ? this._app.set(key, value) : false;
};

AppIo.prototype.get = function (key) {
    return this._app ? this._app.get(key) : false;
};

AppIo.prototype.fork = function () {
    if (this._master) {
        var self = this;

        function forkWorker(worker_id) {
            var worker = cluster.fork({worker_id: worker_id});
            self._map[worker.id] = worker_id;
        }

        for (var i = 0; i < this._cores; i++) {
            forkWorker(i);
        }

        cluster.on('exit', function (worker, code, signal) {
            var old_worker_id = self._map[worker.id];
            delete self._map[worker.id];
            forkWorker(old_worker_id);
        });
    }
};

AppIo.prototype.external = function (source, options) {
    if ( this._master || ! this._app.get('basedir') )
        return false;

    if(Object.prototype.toString.call(options) == '[object Array]') {
        for(o in options) {
            load(source+'/'+options[o], {cwd: this._app.get('basedir'), verbose: false}).into(this._app);
        }

        return;
    }

    load(source, {cwd: this._app.get('basedir'), verbose: false}).into(this._app, options || {});
};

AppIo.prototype.load = function (source, options) {
    if ( this._master || ! this._app )
        return false;

    if(Object.prototype.toString.call(options) == '[object Array]') {
        for(o in options) {
            load(source+'/'+options[o], {cwd: __dirname, verbose: false}).into(this._app);
        }

        return;
    }

    load(source, {cwd: __dirname, verbose: false}).into(this._app, options || {});
};

AppIo.prototype.listen = function () {
    if ( this._master || ! this._app )
        return false;

    var self = this;

    load().into(this._app, function(err, instance) {
        if(err)
            throw err;

        // socket route
        if(self._opts.socket) {
            var router = new self._app.lib.router();

            self._app.io.route = function(namespace, route, fn) {
                router.add(namespace, route, fn);
            }
        }

        self._server.listen(self.get('port'), function() {
            self._app.lib.logger.appio('APP.IO', 'server listening, port:'+self.get('port'));
        });
    });
};

module.exports = AppIo;




