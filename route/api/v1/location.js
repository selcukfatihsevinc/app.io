var async = require('async');
var _     = require('underscore');

module.exports = function(app) {

    var _mdl    = app.middle;
    var _schema = app.lib.schema;

    app.get('/api/location/search', /*_mdl.auth,*/ function(req, res, next) {
        res.apiResponse = true;

        var schema = new _schema('system.locations').init(req, res, next);

        if(schema) {
            schema.search({
                match: {
                    _all: {
                        query: req.query.q,
                        operator: "and"
                    }
                }
            },
            {
                size: 10,
                sort: [
                    {w: {order: 'desc'}},
                    {p: {order: 'desc'}},
                    {_score: {order: 'desc'}}
                ]
            });
        }
    });

};