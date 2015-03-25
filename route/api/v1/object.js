var async = require('async');

module.exports = function(app) {

    var _schema = app.lib.schema;

    /**
     * REST Routes
     */

    app.get('/api/v1/o/:object', app.middle.auth, app.middle.acl, function(req, res, next) {
        res.apiResponse = true;
        var schema = new _schema(req.params.object).init(req, res, next);

        if(schema)
            schema.get(req.query);
    });

    app.get('/api/v1/o/:object/:id', app.middle.auth, app.middle.acl, function(req, res, next) {
        res.apiResponse = true;
        var schema = new _schema(req.params.object).init(req, res, next);

        if(schema)
            schema.getById(req.params.id);
    });

    app.post('/api/v1/o/:object', app.middle.auth, app.middle.acl, function(req, res, next) {
        res.apiResponse = true;
        var schema = new _schema(req.params.object).init(req, res, next);

        if(schema)
            schema.post(req.body);
    });

    app.put('/api/v1/o/:object/:id', app.middle.auth, app.middle.acl, function(req, res, next) {
        res.apiResponse = true;
        var schema = new _schema(req.params.object).init(req, res, next);

        if(schema)
            schema.put(req.params.id, req.body);
    });

    app.delete('/api/v1/o/:object/:id', app.middle.auth, app.middle.acl, function(req, res, next) {
        res.apiResponse = true;
        var schema = new _schema(req.params.object).init(req, res, next);

        if(schema)
            schema.remove(req.params.id);
    });

};