var async = require('async');
var dot   = require('dotty');
var php   = require('phpjs');
var _     = require('underscore');

// speed up calls
var toString = Object.prototype.toString;

function Denormalize(app) {
    this._app      = app;
    this._log      = app.lib.logger;
    this._mongoose = app.core.mongo.mongoose;
    this._models   = {};

    return this;
}

/**
 * @TODO
 * will be deprecated
 */

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

/**
 * @TODO
 * will be deprecated
 */

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

/**
 * ----------------------------------------------------------------
 * Denormalize Process
 * ----------------------------------------------------------------
 */

Denormalize.prototype.process = function (doc, inspector, cb) {
    var self   = this;
    var save   = inspector.Save;
    var denorm = inspector.Denorm;
    var alias  = inspector.Alias;
    var vals   = {};
    var a      = [];

    if( ! denorm )
        return console.log('denormalize.process inspector.Denorm not found');

    // collect ids for references
    _.each(save.properties, function(value, key) {
        if(value.ref && denorm[value.ref]) {
            if( ! vals[value.ref] )
                vals[value.ref] = [];

            if(doc[key]) {
                if(toString.call(doc[key]) == '[object Array]') {
                    _.each(doc[key], function(kV) {
                        if(toString.call(kV.toString) == '[object Function]')
                            kV = kV.toString();

                        vals[value.ref].push(kV);
                    });
                }
                else
                    vals[value.ref].push(doc[key]);
            }
        }
    });

    // query references with unique ids
    _.each(vals, function(value, key) {
        value = _.uniq(value);

        (function(a, model, doc, value, mongoose, denorm, alias) {
            if( ! denorm[model] )
                return console.log('denormalize.process inspector.Denorm[model] not found');

            var target  = _.clone(denorm[model].target);
            var targets = denorm[model].targets;
            var fields  = _.clone(denorm[model].fields);
            
            if( ! target && ! targets ) {
                if( ! target )
                    console.log('denormalize.process inspector.Denorm[model].target not found');
                
                if( ! targets )
                    console.log('denormalize.process inspector.Denorm[model].targets not found');
                
                return;
            }

            /* TARGET */
            if(alias[target])
                target = alias[target];

            if( ! doc[target] )
                doc[target] = {};

            // mixed ve date field'larda modified olarak işaretlenmezse denormalize worker'ları çalıştığında güncellemiyor
            doc.markModified(target);

            /* TARGETS */
            if(targets) {
                var tMain = _.clone(targets.source);
                targets   = _.clone(targets.fields);
                
                // change alias for target fields
               _.each(targets, function(tSource, tTarget) {
                   if(alias[tTarget])
                       targets[alias[tTarget]] = tSource;

                   /**
                    * @TODO
                    * tTarget ve alias[tTarget]'in eşit olması durumunda silinmeyecek
                    */
                   delete targets[tTarget];
               }); 
            }
            
            // model
            var m      = mongoose.model(model);
            var mAlias = dot.get(m.schema, 'inspector.Alias');
            fields     = fields ? fields.split(',') : [];
            
            if(mAlias) {
                _.each(fields, function(field, index) {
                    if(mAlias[field])
                        fields[index] = mAlias[field];
                });

                // change alias for source fields
                _.each(targets, function(tSource, tTarget) {
                    if(mAlias[tSource]) {
                        targets[tTarget] = mAlias[tSource];
                        fields.push(mAlias[tSource]);
                    }
                });
            }

            if(fields.length)
                fields = _.uniq(fields);

            a.push(function(cb) {
                try {
                    m.find({_id: {$in: value}}, fields.join(' '), function(err, data) {
                        if(data) {
                            if(target) {
                                _.each(data, function(dVal, dKey) {
                                    doc[target][dVal._id.toString()] = dVal;
                                });                                
                            }
                            
                            // targets sadece tekil field'lar için denormalize edilecek, target field type=array kontrolü koy
                            if(targets && data.length == 1) {
                                _.each(targets, function(tSource, tTarget) {
                                    if(data[0] && data[0][tSource])
                                        doc[tTarget] = data[0][tSource]; 
                                });
                            }
                        }

                        cb(null, data);
                    });
                }
                catch(e) {
                    console.log(e);
                    cb(null);
                }
            });
        })(a, key, doc, value, self._mongoose, denorm, alias);
    });

    async.parallel(a, function(err, results) {
        cb();
    });
};

/**
 * ----------------------------------------------------------------
 * Denormalize Touch
 * ----------------------------------------------------------------
 */

Denormalize.prototype.touch = function (data, inspector) {
    var self   = this;
    var save   = inspector.Save;
    var name   = inspector.Name;
    var denorm = inspector.Denorm;
    var alias  = inspector.Alias;
    var source = data.source;
    var doc    = data.doc;
    var group  = 'DENORMALIZE:TOUCH';

    if( ! name )
        return console.log('denormalize.touch inspector.Name not found');
    else if( ! denorm )
        return console.log('denormalize.touch inspector.Denorm not found');
    else if( ! source )
        return console.log('denormalize.touch data.source not found');
    else if( ! doc )
        return console.log('denormalize.touch data.doc not found');

    if(denorm[source]) {
        var fields  = _.clone(denorm[source].fields);
        var target  = _.clone(denorm[source].target);
        var targets = denorm[source].targets;
        var docId   = doc._id.toString();
        var updates = {$set: {}};
        var cond    = {};
        group += ':'+name+':_from_:'+source+':'+docId;
        fields = fields ? fields.split(',') : [];
        
        if(alias[target])
            target = alias[target];

        // change alias for target fields
        if(targets) {
            var tMain = _.clone(targets.source);
            targets   = _.clone(targets.fields);
            
            _.each(targets, function(tSource, tTarget) {
                if(alias[tTarget])
                    targets[alias[tTarget]] = tSource;

                /**
                 * @TODO
                 * tTarget ve alias[tTarget]'in eşit olması durumunda silinmeyecek
                 */
                delete targets[tTarget];
            });

            if(alias[tMain])
                tMain = alias[tMain];
        }
        
        // direkt obje şeklinde set etmeye kalkarsak komple denormalize objesini elimizdeki data ile replace eder
        // bu yüzden dot notation şeklinde update edeceğiz (field._id.sub_field = value)
        var updateKey = target+'.'+docId;

        // set update condition
        cond[target+'.'+docId] = {$exists: true};

        // get mongoose doc
        var _doc = dot.get(data, 'doc._doc');
        
        if(_doc) {
            // source model
            var sModel = self._mongoose.model(source);
            var sAlias = dot.get(sModel.schema, 'inspector.Alias');

            if(sAlias) {
                _.each(fields, function(field, index) {
                    if(sAlias[field])
                        fields[index] = sAlias[field];
                });

                // change alias for source fields
                _.each(targets, function(tSource, tTarget) {
                    if(sAlias[tSource])
                        targets[tTarget] = sAlias[tSource];
                });
            }

            _.each(_doc, function(value, key) {
                if(fields.indexOf(key) != -1)
                    updates.$set[updateKey+'.'+key] = value;
            });

            // targets sadece tekil field'lar için denormalize edilecek, target field type=array kontrolü koy
            if(targets) {
                _.each(targets, function(tSource, tTarget) {
                    if(_doc && _doc[tSource])
                        updates.$set[tTarget] = _doc[tSource];
                });
            }

            // override condition if only targets exists
            if( targets && ! target ) {
                cond = {};
                cond[tMain] = docId;
            }
            
            // update model
            var model = self._mongoose.model(name);

            model.update(cond, updates, {multi: true}, function(err, affected, raw) {
                if(err)
                    return self._log.error(group+':UPDATE', err);

                self._log.info(group+':AFFECTED', affected);
            });
        }
    }
};

/**
 * ----------------------------------------------------------------
 * Denormalize Size (count array size)
 * ----------------------------------------------------------------
 */

/**
 * @TODO
 * will be deprecated
 */

Denormalize.prototype.size = function (doc, inspector) {
    var self  = this;
    var name  = inspector.Name;
    var size  = inspector.Size;
    var alias = inspector.Alias;
    var group = 'DENORMALIZE:SIZE';
    var clone, update = {$set: {}};

    if( ! name )
        return console.log('denormalize.size inspector.Name not found');
    else if( ! size )
        return console.log('denormalize.size inspector.Size not found');

    // update model
    var docId   = doc._id.toString();
    var model   = self._mongoose.model(name);
    var aggr    = [];
    var match   = {$match: {_id: self._mongoose.Types.ObjectId(docId)}};
    var project = {$project: {}};

    _.each(size, function(value, key) {
        if(alias[value])
            value = alias[value];

        if(alias[key])
            key = alias[key];

        project.$project[value] = {$size: '$'+key};
    });

    aggr.push(match);
    aggr.push(project);

    model.aggregate(aggr, function (err, result) {
        if(err)
            return self._log.error(group, err);

        if( ! result[0] )
            return self._log.error(group+':RESULT', result);

        result = result[0];
        clone  = _.clone(result);
        delete clone._id;

        _.each(clone, function(value, key) {
            update.$set[key] = value;
        });

        model.update({_id: docId}, update, {}, function(err, affected, raw) {
            if(err)
                return self._log.error(group+':UPDATE', err);

            self._log.info(group+':AFFECTED', affected);
        });
    });
};

/**
 * ----------------------------------------------------------------
 * Denormalize Count (increase or decrease other model's field)
 * ----------------------------------------------------------------
 */

/**
 * @TODO
 * will be deprecated
 */

Denormalize.prototype.count = function (original, doc, inspector) {
    var self  = this;
    var alias = inspector.Alias;
    var count = inspector.Count;
    var props = inspector.Save.properties;
    var a     = [];
    var group = 'DENORMALIZE:COUNT';
    original  = original || {};

    if( ! count )
        return console.log('denormalize.count inspector.Count not found');

    _.each(count, function(target, source) {
        if(alias[source])
            source = alias[source];

        if( ! doc[source] )
            return;

        if( ! props[source].ref )
            return;

        (function(a, original, newest, mongoose, php, ref, target) {
            original = original || [];
            newest   = newest || [];

            if(Object.prototype.toString.call(original) != '[object Array]')
                original = [original];

            if(Object.prototype.toString.call(newest) != '[object Array]')
                newest = [newest];

            original = _.map(original, function(obj) { return obj.toString(); });
            newest   = _.map(newest, function(obj) { return obj.toString(); });

            var newIds = php.array_diff(newest, original) || [];
            var oldIds = php.array_diff(original, newest) || [];
            var model  = mongoose.model(ref);
            var mAlias = dot.get(model.schema, 'inspector.Alias');

            if(mAlias && mAlias[target])
                target = mAlias[target];

            newIds = _.map(newIds, function(obj) { return obj; });
            oldIds = _.map(oldIds, function(obj) { return obj; });

            if(newIds.length) {
                var incr = {$inc: {}};
                incr.$inc[target] = 1;
                a.push(function(cb) {
                    model.update({_id: {$in: newIds}}, incr, {multi: true}, function(err, raw) {
                        if(err) {
                            self._log.error(group+':INCR', err);
                            return cb(null);
                        }

                        self._log.info(group+':INCR:AFFECTED', raw);
                        cb(null);
                    });
                });
            }

            if(oldIds.length) {
                var decr = {$inc: {}};
                decr.$inc[target] = -1;
                a.push(function(cb) {
                    model.update({_id: {$in: oldIds}}, decr, {multi: true}, function(err, raw) {
                        if(err) {
                            self._log.error(group+':DECR', err);
                            return cb(null);
                        }

                        self._log.info(group+':DECR:AFFECTED', raw);
                        cb(null);
                    });
                });
            }
        })(a, original[source], doc[source], self._mongoose, php, props[source].ref, target);
    });

    async.parallel(a, function(err, results) {

    });
};

module.exports = function(app) {
    return new Denormalize(app);
};

