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
    this._test   = options.test;
    
    if(this._test)
        this._verbose = false;
    
    if(process.env.worker_id)
        process.env['worker_id'] = parseInt(process.env.worker_id);

    // set worker id for pm2
    if(process.env.pm_id)
        process.env['worker_id'] = parseInt(process.env.pm_id);
    
    if (cluster.isMaster && ! this._test) {
        console.log('app.io is loading...');
        this.fork();
        return this;
    }

    // set options
    this._opts.basedir = options.basedir || __dirname;
    this._opts.verbose = options.verbose || false;
    
    // application
    this._load   = load;
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
    this._app.set('istest', this._test);
    this._app.set('workerid', parseInt(process.env.worker_id) || 0);

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
    http.globalAgent.maxSockets = 99999;

    return this;
}

AppIo.prototype.run = function (cb) {
    if (this._master && ! this._test)
        return;

    if(this._opts.socket)
        this._app.io = io(this._server);

    // base boot files
    var api = 'body|config|x-powered-by|cors';
    var web = 'view|compress|static|cookie|session|timezone|flash|favicon|locals|admin/redirect|cron|kue|kue-ui|passport|shortener';

    // load config
    this._load = this._load('config/'+this._app.get('env'), {
        cwd: this._opts.basedir, 
        verbose: this._opts.verbose
    });

    var _boot     = this._opts.boot;
    var _external = this._opts.external;
    
    this.external('apidocs');
    this.load('system/logger');
    this.load('lib/logger');
    this.load('boot', ['uncaught']);
    this.load('core', this._opts.core);
    this.load('lib');
    this.external('lib', _external.lib || []);
    this.load('libpost');
    this.external('libpost', _external.libpost || []);
    this.load('middle');
    this.external('middle', _external.middle || []);
    this.load('model', 'acl|feed|oauth|system'.split('|'));
    this.external('model', _external.model || []);
    /* order matters */
    this.load('system/response/app'); // before routes
    // api routes
    this.load('boot', api.split('|'));
    this.load('route/api/v1', 'acl|auth|counter|entity|location|object'.split('|'));
    this.external('api', _external.api || []);
    // web routes
    this.load('boot', web.split('|'));
    this.load('boot', (_boot && this.type(_boot) == '[object String]') ? _boot.split('|') : []);
    this.external('boot', (_external.boot && this.type(_external.boot) == '[object String]')  ? _external.boot.split('|') : []);
    this.external('route', _external.route || []);
    this.load('route/api/v1', ['social']); // requires session
    this.load('route/admin');
    if( this._opts.resize) this.load('boot/resize'); // image resize middlware routes
    this.load('system/handler/app'); // after routes
    this.load('sync/data');
    this.listen(cb);
    
    return this;
};

AppIo.prototype.workers = function () {
    if (this._master)
        return;
    
    // base boot files
    var boot = 'view|cron|kue|shortener';

    // set worker
    this._app.set('isworker', true);

    // load config
    this._load = this._load('config/'+this._app.get('env'), {
        cwd: this._opts.basedir,
        verbose: this._opts.verbose
    });

    var _boot     = this._opts.boot;
    var _external = this._opts.external;
    
    this.load('system/logger');
    this.load('lib/logger');
    this.load('boot', ['uncaught']);
    this.load('core', this._opts.core);
    this.load('lib');
    this.external('lib', _external.lib || []);
    this.load('libpost');
    this.external('libpost', _external.libpost || []);
    this.load('middle');
    this.external('middle', _external.middle || []);
    this.load('model', 'acl|feed|oauth|system'.split('|'));
    this.external('model', _external.model || []);
    this.load('boot', boot.split('|'));
    this.load('boot', (_boot && this.type(_boot) == '[object String]') ? _boot.split('|') : []);
    this.external('boot', _external.boot || []);
    this.load('worker');
    this.external('worker', _external.worker || []);

    var self = this;

    this._load.into(this._app, function(err, instance) {
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
    if ( (this._master || ! this._opts.basedir) && ! this._test )
        return false;

    this._load.options.cwd = this._opts.basedir;
    
    if(Object.prototype.toString.call(options) == '[object Array]') {
        for(o in options) {
            this._load.then(source+'/'+options[o]);
        }

        return;
    }

    this._load.then(source);
};

AppIo.prototype.load = function (source, options) {
    if ( (this._master || ! this._app) && ! this._test )
        return false;

    this._load.options.cwd = __dirname;
    
    if(Object.prototype.toString.call(options) == '[object Array]') {
        for(o in options) {
            this._load.then(source+'/'+options[o]);
        }

        return;
    }

    this._load.then(source);
};

AppIo.prototype.listen = function (cb) {
    if ( (this._master || ! this._app) && ! this._test )
        return false;

    var self = this;

    this._load.into(this._app, function(err, instance) {
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
            self._app.lib.logger.appio('APP.IO', 'server listening, port:'+self.get('port')+', worker: '+self.get('workerid'));
            if(cb) cb();
        });
    });
};

module.exports = AppIo;




