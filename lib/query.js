var async = require('async');
var dot   = require('dotty');
var php   = require('phpjs');
var _     = require('underscore');


/**

 reserved query parameters:
 qt : query type (find|one|count|findcount|distinct|tree)
 f  : fields
 s  : sort
 sk : skip
 l  : limit
 p  : populate

 ?qt=<qtype>&f=<fields>&s=<sort>&sk=<skip>&l=<limit>&p=<populate>

 get conditions:

 key={gt}a
 key is greater than a

 key={gte}a
 key is greater or equal than a

 key={lt}a
 key is lower than a

 key={lte}a
 key is lower or equal than a

 key={in}a,b
 at least one of these is in array

 key={nin}a,b
 any of these values is not in array

 key={ne}a
 key is not equal to a

 key={all}a,b
 all of these contains in array

 key={empty}
 field is empty or not exists

 key={!empty}
 field exists and is not empty

 key={null}
 key is equal to null

 key={near}longitude,latitude,maxDistance
 docs near key

 key={:like:}a
 %like% query

 key={like:}a
 like% query

 key={:like}a
 %like query

 key={null}
 field exists and is null

 key={between}a,b
 docs between values

 {or|b}key1={in}a,b&{or|b}key2=c
 or query (b: 'or' group alias)

 key1=N|{empty}
 or query for same key

 aggregation keys:
 _count_distinct=key
 _group_by_day=key
 _group_by=key

 */

// speed up calls
var hasOwnProperty = Object.prototype.hasOwnProperty;

var parse = function(query, model, opts) {

    try {
        // collect aliases from paths
        var paths = model.schema.paths;
        var alias = {};
        var types = {};

        _.each(paths, function(path, key) {
            if(key == 'parentId') {
                alias['parentId'] = 'parentId';
                types['parentId'] = 'objectid';
            }
            else if( dot.get(path, 'options.alias') ) {
                alias[path.options.alias] = key;
                types[path.options.alias] = path.options.type.name.toLowerCase();

                // if(path.options.typeStr)
                //     types[path.options.alias] = path.options.typeStr.toLowerCase();
            }
            else if( dot.get(path, 'caster.options.alias') ) {
                alias[path.caster.options.alias] = key;
                types[path.caster.options.alias] = path.caster.instance.toLowerCase();

                // if(path.caster.options.typeStr)
                //     types[path.caster.options.alias] = path.caster.options.typeStr.toLowerCase();
            }
        });

        // query object
        var qy = {
            q  : {}, // query
            qt : 'find', // query type
            f  : false, // fields
            s  : false, // sort
            sk : false, // skip
            l  : false, // limit
            p  : false, // populate
            pp : [], // pipe
            at : false // aggregation type
        };

        var toBoolean = function(str) {
            var lower = (typeof str == 'string') ? str.toLowerCase() : str;

            if (lower == 'true' || lower == 'yes')
                return true;
            else if (lower == 'false' || lower == 'no')
                return false;
            else
                return -1;
        };

        var optParse = function(key) {

        }

        var condition = function(key, cond) {
            var operator = false;
            if(typeof key == 'string') {
                operator = key.match(/\{(.*)\}/);
                key = key.replace(/\{(.*)\}/, '');
                if (operator)
                    operator = operator[1];
            }

            // change with alias
            if(alias[key])
                key = alias[key];

            var opKey, arr;
            if( operator && operator.indexOf('|') != -1 ) {
                arr      = operator.split('|');
                operator = arr[0];
                opKey    = arr[1];
            }
            else
                opKey = 'a';

            if( operator && ['or', 'nor'].indexOf(operator) != -1 )
                or(opKey, key, cond, operator == 'nor');
            else
                qy.q[key] = cond;
        };

        var orObj  = {};
        var norObj = {};
        var or = function(container, key, cond, nor) {
            var obj = nor ? norObj : orObj;

            if( ! hasOwnProperty.call(obj, container) )
                obj[container] = [];

            var condition = {};
            condition[key] = cond;
            obj[container].push(condition);
        };

        var parseOr = function(nor) {
            var obj = nor ? norObj : orObj;
            var op  = nor ? '$nor' : '$or';
            var arr = [];

            for(o in obj) {
                if( hasOwnProperty.call(obj, o) )
                    arr.push(obj[o]);
            }

            var len = arr.length;

            if(len == 1)
                qy.q[op] = arr[0];

            else if(len > 1) {
                qy.q['$and'] = [];
                for(a in arr) {
                    if( hasOwnProperty.call(arr, a) ) {
                        var curr = {};
                        curr[op] = arr[a];
                        qy.q['$and'].push(curr);
                    }
                }
            }
        };

        var parts = function(parts) {
            if(typeof parts != 'string')
                return parts;

            parts = parts.split(',');

            for(p in parts) {
                if( hasOwnProperty.call(parts, p) ) {
                    var part = parts[p];
                    var prefix = (part[0] == '-');
                    part = prefix ? part.substring(1) : part;

                    if(alias[part])
                        parts[p] = (prefix ? '-' : '') + alias[part];
                }
            }

            return parts.join(' ');
        };

        var param = function(key, val) {
            var lcKey = key;

            // prevent $ characters
            if(key[0] == '$')
                return;

            // eğer value içinde pipe işareti varsa aynı key için or'luyoruz
            if(typeof val != 'undefined' && types[lcKey] != 'number' && val.indexOf('|') != -1) {
                var valArr = val.split('|');

                _.each(valArr, function(oVal, oKey) {
                    // eğer key zaten bir or grubuna dahil edilmişse key olarak direkt key'in kendisini seçiyoruz
                    if(key.indexOf('{or}') != -1 || key.indexOf('or|') != -1)
                        param(key, oVal);
                    else
                        param('{or|'+key+'}'+key, oVal);
                });

                return;
            }

            var operator = false;
            if(typeof val == 'string') {
                operator = val.match(/\{(.*)\}/);
                val = val.replace(/\{(.*)\}/, '');
                if (operator)
                    operator = operator[1];
            }

            // değer beklemeyen operatörler
            var paramOpts = ['empty', '!empty', 'null'];

            // sanitize number
            if(types[lcKey] == 'number')
                val = parseInt(val) || parseFloat(val);

            // değer bekleyen operatörlerde boş değere izin verme (değeri 0 olanları sorgulamak isteyebiliriz)
            if( paramOpts.indexOf(operator) < 0 && php.empty(val) && val != 0 )
                return;

            // change with alias
            if(alias[lcKey]) {
                if(types[lcKey])
                    types[alias[lcKey]] = types[lcKey];

                lcKey = alias[lcKey];
            }

            var values = [];
            var bool   = toBoolean(val);

            // aggregation vars
            var _project = {$project: {}}, _match = {$match: {}}, _sort = {$sort: {}}, _key;

            if(lcKey == 'fields')
                qy.f = parts(val);

            else if(lcKey == 'sort')
                qy.s = parts(val);

            else if(lcKey == 'populate')
                qy.p = parts(val);

            else if(lcKey == '_count_distinct') {
                qy.qt = 'aggregate';
                qy.at = lcKey;
                _key  = alias[val] || val;
                
                _match.$match[_key] = {$exists: true};

                qy.pp.push( _match );
                qy.pp.push( {$group: {_id: '$'+_key}} );
                qy.pp.push( {$group: {_id: 1, count: {$sum: 1}}} );
            }

            else if(lcKey == '_group_by_day') {
                qy.qt = 'aggregate';
                qy.at = lcKey;
                _key  = alias[val] || val;

                _project.$project = {_id: 0, h: {$hour: '$'+_key}, m: {$minute: '$'+_key}, s: {$second: '$'+_key}, ml: {$millisecond: '$'+_key}};
                _project.$project[_key] = 1;
                qy.pp.push( _.clone(_project) );

                _project.$project = {_id: 0};
                _project.$project[_key] = {
                    $subtract: ['$'+_key, {$add: ['$ml', {$multiply: ['$s', 1000]}, {$multiply: ['$m', 60, 1000]}, {$multiply: ['$h', 60, 60, 1000]}]}]
                }

                qy.pp.push( _.clone(_project) );
                qy.pp.push( {$group: {_id : '$'+_key, count: {$sum: 1}}} );
            }

            else if(lcKey == '_group_by') {
                qy.qt = 'aggregate';
                qy.at = lcKey;
                _key  = alias[val] || val;

                _match.$match[_key] = {$exists: true};

                qy.pp.push( _match );
                qy.pp.push( {$group: {_id: '$'+_key, count: {$sum: 1}}} );
            }

            else if(bool != -1) {
                if( bool == false ) {
                    or(lcKey, lcKey, bool); // or
                    or(lcKey, lcKey, {$exists: false}); // or
                }
                else
                    condition(lcKey, bool);
            }
            else if (['gt', 'gte', 'lt', 'lte'].indexOf(operator) >= 0) {
                // direkt date objesi geldiyse işlem yapma
                if(types[lcKey] == 'date' && typeof val != 'object')
                    val = new Date(val);

                var obj = {};
                obj['$'+operator] = val;
                condition(lcKey, obj);
            }
            else if(operator == 'between') {
                values = val.split(',');

                // direkt date objesi geldiyse işlem yapma
                if(types[lcKey] == 'date' && typeof values[0] != 'object' && typeof values[1] != 'object') {
                    values[0] = new Date(values[0]);
                    values[1] = new Date(values[1]);
                }

                var bobj = {};
                bobj['$gte'] = values[0];
                bobj['$lt'] = values[1];

                condition(lcKey, bobj);
            }
            else if(operator == 'in') {
                values = val.split(',');
                condition(lcKey, {$in: values});
            }
            else if(operator == 'nin') {
                values = val.split(',');
                condition(lcKey, {$nin: values});
            }
            else if(operator == 'ne')
                condition(lcKey, {$ne: val});

            else if(operator == 'all') {
                values = val.split(',');
                condition(lcKey, {$all: values});
            }
            else if(operator == 'empty') {
                // eğer key'in içinde pipe varsa başka bir or grubuna aittir
                if(lcKey.indexOf('{or}') != -1 || lcKey.indexOf('or|') != -1) {
                    condition(lcKey, '');
                    condition(lcKey, {$exists: false});
                }
                else{
                    if(types[lcKey] == 'string')
                        or(lcKey, lcKey, ''); // or

                    or(lcKey, lcKey, {$exists: false}); // or
                }
            }
            else if(operator == '!empty') {
                or(lcKey, lcKey, '', true); // nor
                or(lcKey, lcKey, {$exists: false}, true); // nor
            }
            else if(operator == 'null') {
                or(lcKey, lcKey, null);
            }
            else if(operator == 'near') {
                var locs = val.split(',');
                var dist = {
                    $nearSphere: [parseFloat(locs[0]), parseFloat(locs[1])]
                }

                // as kilometers
                if (typeof locs[2] != 'undefined')
                    dist.$maxDistance = parseFloat(locs[2])/6371

                condition(lcKey, dist);
            }
            else if(operator == ':like:') {
                try {
                    condition(lcKey, new RegExp(val, 'i'));
                }
                catch(e) {}
            }
            else if(operator == 'like:') {
                try {
                    condition(lcKey, new RegExp('^'+val, 'i'));
                }
                catch(e) {}
            }
            else if(operator == ':like') {
                try {
                    condition(lcKey, new RegExp(val+'$', 'i'));
                }
                catch(e) {}
            }
            else if(operator == 'null')
                condition(lcKey, null);

            /**
             * @TODO
             * other mongodb operators
             */
            else
                condition(lcKey, val);

            lcKey = operator = paramOpts = values = bool = null;
        };

        for(var key in query) {
            if( ! hasOwnProperty.call(query, key) )
                continue;

            switch(key) {
                case('qt'):
                case('qtype'):
                    qy.qt = query[key];
                    break;

                case('f'):
                case('fields'):
                    param('fields', query[key]);
                    break;

                case('s'):
                case('sort'):
                    param('sort', query[key]);
                    break;

                case('sk'):
                case('skip'):
                    qy.sk = parseInt(query[key]);
                    break;

                case('l'):
                case('limit'):
                    qy.l = parseInt(query[key]);
                    break;

                case('p'):
                case('populate'):
                    param('populate', query[key]);
                    break;

                default:
                    param(key, query[key]);
                    break;
            }

        }

        parseOr(); // parse or
        parseOr(true); // parse nor

        paths = alias = orObj = norObj = null;
        toBoolean = condition = or = parseOr = parts = param = null;
        return qy;
    }
    catch (e) {
        console.log(e);
        return false;
    }
};

var keyParser = function(input, type) {

    if((typeof input) != 'string')
        return false;

    var neg = 0;
    if(type == 'sort')
        neg = -1;

    var output = {};
    var keys   = input.split(',');

    for(var i in keys) {
        var key = keys[i];

        if(key.length >1) {
            if(key[0] === '-')
                output[key.substring(1)] = neg;
            else
                output[key] = 1;
        }
        else{
            if(key.length === 0)
                continue;

            output[key] = 1;
        }
    }

    return output;
}

var doQuery = function(query, model, opts, cb) {

    var q = parse(query, model, opts);
    var m = model;

    if( ! q )
        return cb({name: 'QueryParserError'});

    var notFound       = {name: 'NotFound'};
    var notSupported   = {name: 'NotSupportedQueryType'};
    var notFoundFields = {name: 'NotFoundFields'};

    // set default limit
    if( ! q.l )
        q.l = 10;

    // set maximum limit
    if(['find', 'findcount', 'randomfind', 'ids'].indexOf(q.qt) >= 0 && q.l > 250)
        q.l = 250;
    
    // query type
    switch(q.qt) {
        case 'find':
            m = m.find(q.q);
            break;

        case 'ids':
            q.f = '_id';
            m = m.find(q.q);
            break;
        
        case 'stream':
            m = m.find(q.q);

            if(q.sk) m.skip(q.sk);
            if(q.l)  m.limit(q.l);

            if (opts.lean) m.lean();

            // set batch size
            m.batchSize(500);

            cb(null, m.stream(), _.clone(q));
            break;

        case 'one':
            m = m.findOne(q.q);
            break;

        case 'count':
            model.count(q.q, function(err, count) {
                err ? cb(err) : cb(err, {count: count}, _.clone(q));
            });

            return;

        case 'findcount':
            m = m.find(q.q);
            break;

        case 'tree':
            if(q.q.parentId && typeof model.GetChildren == 'function') {
                // check parent id (eğer parent id null gelirse materialized içinden hata atıyor - model.GetChildren)
                model.findOne({_id: q.q.parentId}, function (err, parent) {
                    if( ! parent )
                        return cb(notFound);

                    model.GetChildren(q.q.parentId, function (err, children) {
                        err ? cb(err) : cb(err, model.ToArrayTree(children), _.clone(q));
                    });
                });
            }
            else if(typeof model.GetFullArrayTree == 'function') {
                model.GetFullArrayTree(function (err, tree) {
                    err ? cb(err) : cb(err, tree, _.clone(q));
                });
            }
            else
                cb(notSupported);

            return;

        case 'randomfind':
            if(typeof model.qRand == 'function') {
                q.q = model.qRand(q.q);
                m = m.find(q.q);
            }
            else
                cb(notSupported);

            break;

        case 'randomone':
            if(typeof model.qRand == 'function') {
                q.q = model.qRand(q.q);
                m = m.findOne(q.q);
            }
            else
                cb(notSupported);

            break;

        case 'distinct':
            if(q.f) {
                model.distinct(q.f, q.q, function(err, doc) {
                    cb(err, doc, _.clone(q));
                });
            }
            else
                cb(notFoundFields);

            return;

        case 'aggregate':
            q.pp.unshift({$match: _.clone(q.q)});

            if(q.at == '_group_by' && q.f) {
                var fields = keyParser(q.f);

                fields = _.mapObject(fields, function(val, key) {
                    return {$first: '$'+key};
                });

                // copy fields to group object
                q.pp[2].$group = _.extend(q.pp[2].$group, fields);
            }

            if(q.s)
                q.pp.push({$sort: keyParser(q.s, 'sort')});

            if(q.sk)
                q.pp.push({$skip: q.sk});

            if(q.l)
                q.pp.push({$limit: q.l});

            break;

        default:
            return cb(notSupported);
    }

    var qt = q.qt;

    if( ['find', 'one', 'findcount', 'randomfind', 'randomone', 'ids'].indexOf(qt) >= 0 ) {
        if(q.s)  m.sort(q.s);
        if(q.sk) m.skip(q.sk);
        if(q.l)  m.limit(q.l);
        if(q.f)  m.select(q.f);
        if(q.p)  m.populate(q.p);

        if (opts.lean) m.lean();
    }

    if( ['find', 'one', 'randomfind', 'randomone', 'ids'].indexOf(qt) >= 0 ) {
        m.exec(function(err, doc) {
            cb(err, doc, _.clone(q));
        });

        m = null;
    }

    if( ['findcount'].indexOf(qt) >= 0 ) {
        var a = {
            rows: function(cb) {
                m.exec(cb);
            },
            total: function(cb) {
                model.count(q.q, cb);
            }
        };

        async.parallel(a, function(err, results) {
            cb(err, {
                rows: results.rows,
                total: results.total,
            }, _.clone(q));
        });
    }

    if(qt == 'aggregate') {
        m = m.aggregate(q.pp);
        m.exec(function(err, doc) {
            cb(err, doc, _.clone(q));
        });
    }

    qt = null;
};

function QueryPlugin(schema) {

    schema.statics.parse = function(q, o) {
        return parse(q, this, o);
    };

    schema.statics.q = function(q, o, cb) {
        // q: query, o: options, cb: callback
        o = o || {};
        doQuery(q, this, o, cb);
    };

}

module.exports = function(app) {
    return QueryPlugin;
};


