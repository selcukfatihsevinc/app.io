function Router() {
    this.isListening = false;
    this.routes      = [];
    this.nsps        = [];
}

Router.prototype.add = function(namespace, route, cb) {
    if(this.isListening)
        throw Error('app.io socket is listening');

    if( ! cb ) {
        cb        = route;
        route     = namespace;
        namespace = '/';
    }

    if(typeof namespace !== 'string' || typeof route !== 'string' || typeof cb !== 'function')
        throw Error('app.io socket route argument error');

    this.routes.push({namespace: namespace, route: route, fn: cb});

    if(this.nsps.indexOf(namespace) < 0)
        this.nsps.push(namespace);
};

Router.prototype.addListeners = function(io) {
    for(var i = 0; i < this.nsps.length; i++) {

        (function(i, self) {
            io.of(self.nsps[i]).on('connection', function(s) {
                self.listen(self.nsps[i], s);
            });
        })(i, this);

    }

    this.isListening = true;
};

Router.prototype.listen = function(namespace, socket) {
    for(var i = 0; i < this.routes.length; i++) {

        if(this.routes[i].namespace !== namespace)
            continue;

        (function(i, self) {
            socket.on(self.routes[i].route, function(data) {
                self.routes[i].fn(socket, data);
            });
        })(i, this);
    }
};

module.exports = function(app) {
    return Router;
};
