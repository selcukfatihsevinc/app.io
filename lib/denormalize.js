var async = require('async');
var _     = require('underscore');

function Denormalize(app) {
    this._app      = app;
    this._mongoose = app.core.mongo.mongoose;
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
                try {
                    m.findById(doc[value.source], function(err, source) {
                        if(source) {
                            _.each(value.fields, function(fVal, fKey) {
                                /**
                                 * @TODO
                                 * sync etme işleminde ref alanlarında değer değişmeden save hook'larını çalıştırmak istiyoruz
                                 * o yüzden isNew veya isModified kontrolü yapma
                                 */
                                    // if(doc.isNew || doc.isModified(fKey))
                                doc[fKey] = source[fVal];
                            });
                        }

                        m = null;
                        cb(null, source);
                    });
                }
                catch(e) {
                    console.log(e);
                    cb(null);
                }
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
                console.log(err.stack);

            m = cond = updates = null;
        });
    });
};

function transform(doc) {
    return doc;
}

Denormalize.prototype.sync = function (model, kue) {
    var self = this;

    if(self._app.get('isworker'))
        return console.log('denormalize start failed (because this is worker instance)')

    // update model
    var m = self._mongoose.model(model);
    var stream = m.find({}).stream({transform: transform});

    stream.on('data', function (doc) {

        kue.create('denormalize-document', {
            title: 'Denormalize document',
            params: {
                type: 'denormalize-document',
                model: model,
                id: doc._id.toString()
            }
        }).attempts(3).removeOnComplete(true).save();

    }).on('error', function (err) {
        console.error(err.stack);
    }).on('end', function () {
        console.log(model+' sync stream end');
    });

    return stream;
};

module.exports = function(app) {
    return new Denormalize(app);
};

