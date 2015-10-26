var async = require('async');
var _     = require('underscore');

module.exports = function(app) {

    var _mdl    = app.middle;
    var _resp   = app.system.response.app;
    var _schema = app.lib.schema;

    app.get('/api/location/search',
        _mdl.client,
        _mdl.json,
    function(req, res, next) {
        var q      = req.query.q;
        var page   = req.query.page || 1;
        var size   = req.query.size || 10;
        var fc     = req.query.feature_codes;
        var schema = new _schema('system.locations').init(req, res, next);

        if(fc)
            fc = fc.split(',');

        var shouldArr = [];
        if(fc && fc.length) {
            _.each(fc, function(value) {
                shouldArr.push({query: {match: {fc: value}}});
            });
        }

        var query = {
            filtered: {
                filter: {
                    bool: {
                        must_not: [
                            {query: {match: {fc: 'HTL'}}}, // Otel
                            {query: {match: {fc: 'CSNO'}}}, // Kumarhane
                            {query: {match: {fc: 'RSRT'}}}, // Tatil yeri
                            {query: {match: {fc: 'GHSE'}}}, // Konukevi
                            {query: {match: {fc: 'SPA'}}}, // Spa
                            {query: {match: {fc: 'HMSD'}}}, // Kır evi
                            {query: {match: {fc: 'HSE'}}}, // Ev
                            {query: {match: {fc: 'HSEC'}}} // Yazlık ev
                        ]
                    }
                },
                query: {
                    match: {
                        _all: {
                            query: q,
                            operator: 'and'
                        }
                    }
                }
            }
        };

        // set should filter
        if(shouldArr.length)
            query.filtered.filter.bool.should = shouldArr;

        // execute search
        schema.search(query, {
            hydrate: true,
            hydrateOptions: {
                populate: {
                    path: 'parentId',
                    select: 'n an aen atr fc'
                },
                select: 'parentId n an aen uen atr utr uri uc cc fc w',
                lean: true
            },
            from: (page-1)*size,
            size: size,
            sort: [
                {p: {order: 'desc'}},
                {_score: {order: 'desc'}}
            ]
        }, function(err, doc) {
            _resp.OK({doc: doc}, res);
        });

    });

};