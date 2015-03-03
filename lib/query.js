var async = require('async');
var php   = require('phpjs');
var _     = require('underscore');

_.mixin(require('safe-obj'));

var log = function(obj) {
    console.log(JSON.stringify(obj));
};

// speed up calls
var hasOwnProperty = Object.prototype.hasOwnProperty;

var parse = function(query, model, opts) {

    /**

     reserved:
        qt,  query type
        f,  fields
        s,  sort
        sk, skip
        l,  limit
        p,  populate

     [&qt=<qtype>][&f=<fields>][&s=<sort>][&sk=<skip>][&l=<limit>][&p=<populate>]
     qt=<qtype> find|one|count|findcount|distinct
     f=<fields>
     s=<sort>
     sk=<skip>
     l=<limit>
     p=<populate>

     search conditions:

     "key={gt}a"
     "Docs key is greater than a"

     "key={gte}a"
     "Docs key is greater or equal than a"

     "key={lt}a"
     "Docs key is lower than a"

     "key={lte}a"
     "Docs key is lower or equal than a"

     "key={in}a,b"
     "At least one of these is in array"

     "key={nin}a,b"
     "Any of these values is not in array"

     "key={ne}a"
     "Docs key is not equal to a"

     "key={all}a,b"
     "All of these contains in array"

     "key={empty}"
     "Field is empty or not exists"

     "key={!empty}"
     "Field exists and is not empty"

     "key={near}longitude,latitude,maxDistance"
     "Docs near key"

     "key={:like:}a"
     "%like% query"

     "key={like:}a"
     "like% query"

     "key={:like}a"
     "%like query"

     "key={null}"
     "Field exists and is null"

     "{or|b}key1={in}a,b&{or|b}key2=c"
     "or query (b: or group alias)"

     "key1=N|{empty}"
     "or query for same key"

     */

    // collect aliases from paths
    var paths = model.schema.paths;
    var alias = {};

    _.each(paths, function(path, key) {
        if( _(path).safe('options.alias') )
            alias[path.options.alias] = key;
        else if( _(path).safe('caster.options.alias') )
            alias[path.caster.options.alias] = key;
    });

    var qy = {
        q  : {}, // query
        qt : 'find', // query type
        f  : false, // fields
        s  : false, // sort
        sk : false, // skip
        l  : false, // limit
        p  : false // populate
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
        if(typeof val != 'undefined' && val.indexOf('|') != -1) {
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

        // değer bekleyen operatörlerde boş değere izin verme
        if( paramOpts.indexOf(operator) < 0 && php.empty(val) )
            return;

        // change with alias
        if(alias[lcKey])
            lcKey = alias[lcKey];

        var values = [];
        var bool   = toBoolean(val);

        if(lcKey == 'fields')
            qy.f = parts(val);

        else if(lcKey == 'sort')
            qy.s = parts(val);

        else if(lcKey == 'populate')
            qy.p = parts(val);

        else if(bool != -1) {
            if( bool == false ) {
                or(lcKey, lcKey, bool); // or
                or(lcKey, lcKey, {$exists: false}); // or
            }
            else
                condition(lcKey, bool);
        }
        else if (['gt', 'gte', 'lt', 'lte'].indexOf(operator) >= 0) {
            /**
             * TODO
             * date değerleri de handle et
             */
            var obj = {};
            obj['$'+operator] = val;
            condition(lcKey, obj);
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
                or(lcKey, lcKey, ''); // or
                or(lcKey, lcKey, {$exists: false}); // or
            }
        }
        else if(operator == '!empty') {
            or(lcKey, lcKey, '', true); // nor
            or(lcKey, lcKey, {$exists: false}, true); // nor
        }
        else if(operator == 'near') {
            var locs = val.split(',');
            var dist = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(locs[0]), parseFloat(locs[1])]
                    }
                }
            };

            if (typeof locs[2] != 'undefined')
                dist.$near.$maxDistance = parseFloat(locs[2]);

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
};

var doQuery = function(query, model, opts, cb) {

    var q = parse(query, model, opts);
    var m = model;

    log(q);

    /**
     * @TODO
     * type'lar pipe ile kullanılabilsin
     * find|count gibi, her iki sonucu dönsün
     */

    switch(q.qt) {
        case 'find':
            m = m.find(q.q);
            break;

        case 'one':
            m = m.findOne(q.q);
            break;

        case 'count':
            model.count(q.q, function(err, count) {
                err ? cb(err) : cb(err, {count: count});
            });

            return;

        case 'findcount':
            m = m.find(q.q);
            break;

        case 'tree':
            if(q.q.parentId && typeof model.GetChildren == 'function') {
                model.GetChildren(q.q.parentId, function (err, children) {
                    err ? cb(err) : cb(err, model.ToArrayTree(children));
                });
            }
            else if(typeof model.GetFullArrayTree == 'function') {
                model.GetFullArrayTree(function (err, tree) {
                    err ? cb(err) : cb(err, tree);
                });
            }
            else {
                console.log('not supported tree structure');
                cb(true);
            }

            return;

        /**
         * @TODO
         * cb(true) yerine {type: 'Error'} gibi type oluştur, hatayı anlamlandır
         */

        case 'distinct':
            q.f ? model.distinct(q.f, q.q, cb) : cb(true);
            return;

        default:
            console.log('not supported query type');
            return cb(true);
    }

    var qt = q.qt;

    if( ['find', 'one', 'findcount'].indexOf(qt) >= 0 ) {
        if(q.s)  m.sort(q.s);
        if(q.sk) m.skip(q.sk);
        if(q.l)  m.limit(q.l);
        if(q.f)  m.select(q.f);
        if(q.p)  m.populate(q.p);

        if (opts.lean) m.lean();
    }

    if( ['find', 'one'].indexOf(qt) >= 0 ) {
        m.exec(cb);
        q = m = null;
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

        async.parallel(a, cb);
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


