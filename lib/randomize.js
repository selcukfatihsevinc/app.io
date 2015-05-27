var async = require('async');
var _     = require('underscore');

function Randomize(mongoose) {
    this._mongoose = mongoose;
    this._models   = {};
    return this;
}

function transform(doc) {
    return doc;
}

Randomize.prototype.sync = function (model, kue) {
    var self = this;

    // update model
    var m = self._mongoose.model(model);
    var stream = m.find({}).stream({transform: transform});

    stream.on('data', function (doc) {

        kue.create('randomize-document', {
            title: 'Randomize document',
            params: {
                type  : 'randomize-document',
                model : model,
                id    : doc._id.toString()
            }
        }).attempts(3).removeOnComplete(true).save();

    }).on('error', function (err) {
        console.error(err.stack);
    }).on('end', function () {
        console.log(model+' randomize sync stream end');
    });

    return stream;
};

module.exports = function(app) {
    return new Randomize(app.core.mongo.mongoose);
};

