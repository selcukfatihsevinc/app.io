var async = require('async');
var _     = require('underscore');

function Denormalize(mongoose) {
    this._mongoose = mongoose;
    this._models   = {};
    return this;
}

Denormalize.prototype.fill = function (doc, fields, cb) {
    var self = this;
    var a    = [];

    _.each(fields, function(value, key) {
        // value: {ref: 'System_Users', source: 'u', fields: {una: 'n'}}

        (function(a, doc, value) {
            var m = self._mongoose.model(value.ref);

            a.push(function(cb) {
                m.findById(doc[value.source], function(err, source) {
                    if(source) {
                        _.each(value.fields, function(fVal, fKey) {
                            if(doc.isNew || doc.isModified(fKey))
                                doc[fKey] = source[fVal];
                        });
                    }

                    m = null;
                    cb(null, source);
                });
            });
        })(a, doc, value);
    });

    async.parallel(a, function(err, results) {
        a = null;
        cb();
    });
};

Denormalize.prototype.update = function (model, ref, doc, fields) {
    var self = this;

    // update model
    var m = self._mongoose.model(model);

    _.each(fields, function(value, key) {
        // value: {ref: 'System_Users', source: 'u', fields: {una: 'na'}}

        if(value.ref != ref)
            return;

        var cond = {}, updates = {};
        cond[value.source] = doc._id.toString();

        _.each(value.fields, function(fVal, fKey) {
            if(doc[fVal])
                updates[fKey] = doc[fVal];
        });

        m.update(cond, updates, {multi: true}, function(err) {
            if(err)
                console.log(err);

            m = cond = updates = null;
        });
    });
};

module.exports = function(app) {
    return new Denormalize(app.core.mongo.mongoose);
};

