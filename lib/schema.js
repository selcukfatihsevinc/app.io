var inspector = require('schema-inspector');
var parser    = require('parseable').operationParser;
var Promise   = require('bluebird');
var sanitize  = require('sanitize-html');
var async     = require('async');
var knox      = require('knox');
var dot       = require('dotty');
var php       = require('phpjs');
var _         = require('underscore');

// speed up calls
var hasOwnProperty = Object.prototype.hasOwnProperty;
var toString       = Object.prototype.toString;

function Schema(name, options) {
    this._name    = name; // schema name
    this._options = options || {}; // schema options
    this._err     = false;
    
    return this;
}

Schema.prototype.err = function () {
    this._err = true;
    return this;
};

Schema.prototype.init = function () {
    // set arguments
    if(arguments.length == 3) { // req, res, next
        this._req  = arguments[0];
        this._app  = this._req.app;
        this._res  = arguments[1];
        this._next = arguments[2];
    }
    else
        this._app = arguments[0]; // app

    // http responses
    this._http = this._app.system.response ? this._app.system.response.app : false;

    // base model
    this._model = this.getModel(this._name);

    if( ! this._model )
        return this._err ? false : this.errors({name: 'SchemaError'});

    // config
    this._env    = this._app.get('env');
    this._config = this._app.config[this._env].api;
    this._log    = this._app.lib.logger;

    // schema
    this._alias      = this._model.schema.inspector.Alias;
    this._key2alias  = this._model.schema.inspector.KeyAlias;
    this._save       = this._model.schema.inspector.Save;
    this._update     = this._model.schema.inspector.Update;
    this._refs       = this._model.schema.inspector.Refs;
    this._schemaOpts = this._model.schema.inspector.Options;
    this._owner      = this._model.schema.inspector.Owner;
    this._mask       = this._model.schema.inspector.Mask;
    this._structure  = this._model.schema.structure;
    this._master     = this._req ? this._req.__master : undefined;

    // is api call?
    this._api = (this._res && this._res.__api);

    // is user?
    this._user = (this._req && this._req.__user) ? this._req.__user.id : false;

    // is guest?
    this._guest = (this._user == 'guest');
    
    // has profile?
    this._profile = (this._req && this._req.__user) ? this._req.__user.profile : false;
    
    // has app id?
    this._appId = (this._req && this._req.__system_AppId) ? this._req.__system_AppId : false;
    
    // logger group
    this._group = 'SCHEMA:'+this._name;

    if(this._api)
        this._group = 'API:'+this._group;

    if(this._user)
        this._group += ':USER:'+this._user;

    // s3 object
    this._s3 = {};
    
    var self = this;

    // set custom fields
    this._sanitize = {
        html: function(schema, post) {
            if(typeof post == 'string') {
                post = sanitize(post, dot.get(schema, 'settings.html') || {
                    allowedTags: [],
                    allowedAttributes: {}
                });
            }

            return post;
        }
    };

    this._validate = {
        empty: function (schema, candidate, cb) {
            // date objesi geldiyse kontrol etmiyoruz, yoksa empty olarak işaretliyor
            if(self.type(candidate) == '[object Date]')
                return cb();

            candidate = php.trim(candidate);

            if(typeof candidate == 'undefined' || php.empty(candidate))
                this.report('empty field', schema.code);

            cb();
        },

        objectid: function (schema, candidate, cb) {
            var type = self.type(candidate);

            // update işleminde field tanımlanmadıysa bile bu kontrole giriyor
            // optional ve tanımlanmamış alan için kontrol etmiyoruz
            if(typeof candidate == 'undefined')
                return cb();
            // sanitize'dan [''] şeklinde geçen field'lar düzeltilecek
            else if(type == '[object Array]' && candidate.length && candidate[0] == '')
                return cb();

            var t = this;
            var m = self.getModel(schema.ref);

            if( ! m ) {
                t.report('non existing reference', schema.code);
                return cb();
            }

            self.log('OBJECTID', candidate);

            /**
             * @TODO
             * self._id artık kullanılmıyor, "same reference" kontrolü gerekirse daha sonra ekle
             */
            
            /*
            if(candidate == self._id) {
                t.report('same reference id', schema.code);
                return cb();
            }
            */
            
            var i = (self.type(candidate) == '[object Array]') ? candidate : [candidate];

            m.count({_id: {$in: i}}, function(err, count) {
                if(count != i.length && candidate)
                    t.report('non existing id', schema.code);

                cb();
            });
        }
    };

    return this;
};

Schema.prototype.log = function(key, value) {
    this._log.schema(this._group+':'+key, value, this._api);
};

Schema.prototype.getModel = function (name) {
    name = name.toLowerCase();
    name = name.replace('_', '.');
    return dot.get(this._app.model, name);
};

Schema.prototype.type = function(value) {
    return toString.call(value);
};

Schema.prototype.isTrue = function(input) {
    if (typeof input == 'string')
        return input.toLowerCase() == 'true';

    return !!input;
};

Schema.prototype.protect = function(type) {
    return (this._owner && dot.get(this._owner, 'protect.'+type) && this._api);
};

Schema.prototype.clone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
};

// errors ile üretilen hatayı callback ile aldıktan sonra http response vermek istersek bunu kullanacağız
Schema.prototype.errResponse = function (err) {
    switch(err.type) {
        case 'ValidationError':
            return this._next(this._http.UnprocessableEntity(err));
            break;

        case 'NotFound':
            return this._next(this._http.NotFound());
            break;

        default:
            break;
    }

    return this._next(this._http.InternalServerError(err));
};

Schema.prototype.errors = function (err, cb) {
    var resp = {
        type : 'SystemError'
    };

    this._log.error(this._group, err);

    switch(err.name) {
        case 'ValidationError':
            resp.type   = 'ValidationError';
            resp.errors = [];

            _.each(err.errors, function(field, key) {
                var message = field.message;
                var slug;

                if(message == 'is missing and not optional')
                    slug = 'required_error';
                else if(message.indexOf('must have at least key') != -1)
                    slug = 'some_keys_error';
                else if(message.indexOf('must match') != -1)
                    slug = 'pattern_error';
                else if(message.indexOf('must be longer than') != -1)
                    slug = 'min_length_error';
                else if(message.indexOf('must be shorter than') != -1)
                    slug = 'max_length_error';
                else if(message.indexOf('must have exactly') != -1)
                    slug = 'exact_length_error';
                else if(message.indexOf('must be less than') != -1)
                    slug = 'lower_than_error';
                else if(message.indexOf('must be less than or equal to') != -1)
                    slug = 'lower_than_equal_error';
                else if(message.indexOf('must be greater than') != -1)
                    slug = 'greater_than_error';
                else if(message.indexOf('must be greater than or equal to') != -1)
                    slug = 'greater_than_equal_error';
                else if(message.indexOf('must be equal to') != -1)
                    slug = 'equal_error';
                else if(message.indexOf('must not be equal to') != -1)
                    slug = 'not_equal_error';
                else if(message.indexOf('must have at least key') != -1)
                    slug = 'need_some_fields_error';

                resp.errors.push({
                    path    : field.code || field.property || field.path,
                    message : message,
                    slug    : slug
                });
            });

            cb ? cb(resp) : this._next(this._http.UnprocessableEntity(resp));
            resp = null;
            return;
            break;

        case 'NotFound':
            resp.type = 'NotFound';
            cb ? cb(resp) : this._next(this._http.NotFound());
            resp = null;
            return;
            break;

        case 'MongoError':
            var message = err.message;
            if(err.code == 11000)
                message = 'unique_error';

            resp.type   = 'MongoError';
            resp.errors = [];
            resp.errors.push({code: err.code, message: message, slug: message});
            break;

        case 'CastError':
            resp.type   = 'CastError';
            resp.errors = [];
            resp.errors.push({path: err.path, message: err.message});
            break;

        case 'ParserError':
            resp.type   = 'ParserError';
            resp.errors = [];
            resp.errors.push({message: err.message});
            break;

        case 'SchemaError':
            resp.type = err.name;
            break;

        case 'QueryParserError':
            resp.type = err.name;
            break;

        case 'NotSupportedQueryType':
            resp.type = err.name;
            break;

        default:
            break;
    }

    cb ? cb(resp) : this._next(this._http.InternalServerError(resp));
    resp = null;
};

// model structure
Schema.prototype.structure = function (cb) {
    if( ! this._structure )
        return cb ? cb({name: 'NotFound'}) : this.errors({name: 'NotFound'});

    cb ? cb(null, this._structure) : this._http.OK(this._structure, this._res);
};

// only parse query, don't execute
Schema.prototype.parse = function (obj) {
    return this._model.parse(obj);
};

Schema.prototype.getMaskFields = function (type) {
    var fields = false;

    // api request'lerine mask uygulanacak
    if(this._api && this._app.lib.utils && this._mask && this._mask[type]) {
        var mask = this._mask[type];

        if(this._master) {
            fields = mask.master || mask.owner || mask.user || mask.guest;
            this.log('MASK:TYPE', 'master');
        }
        else if(this.protect(type)) {
            fields = mask.owner || mask.user || mask.guest;
            this.log('MASK:TYPE', 'owner');
        }
        else if(this._user && this._user != 'guest') {
            fields = mask.user || mask.guest;
            this.log('MASK:TYPE', 'user');
        }
        else {
            fields = mask.guest;
            this.log('MASK:TYPE', 'guest');
        }
    }
    
    return fields;
};

// execute json masking
Schema.prototype.mask = function (type, doc) {
    var self   = this;
    var fields = this.getMaskFields(type);

    if(fields) {
        _.each(doc, function(value, key) {
            doc[key] = self._app.lib.utils.helper.mask(value, fields);
        });
    }
};

// execute json masking for one document
Schema.prototype.maskOne = function (type, doc) {
    var fields = this.getMaskFields(type);

    // change doc
    if(fields)
        return this._app.lib.utils.helper.mask(doc, fields);
    
    return doc;
};

// execute "this.from" for doc array
Schema.prototype.formatFrom = function (doc) {
    var self = this;
    
    _.each(doc, function(value, key) {
        self.from(value);
    });
};

Schema.prototype.getFunc = function (obj, self, cb) {
    self = self || this;

    // set app id for system objects (before self._model.q)
    if(self._appId)
        obj.apps = self._appId;

    // set acl owner protection (api response ise owner protection uygula)
    if( ! self._master && self.protect('get') )
        obj[self._owner.alias] = self._user;

    self.log('GET:DATA:NAKED', obj);

    self._model.q(obj, self._config.query, function(err, doc, query) {
        if(query)
            self.log('GET:DATA:QUERY', query);

        if(err)
            return cb ? cb(err) : self.errors(err);

        var type = self.type(doc);

        // qtype = find için sonuçları ayrı ayrı self.from'dan geçiriyoruz
        if(type == '[object Array]') {
            if( ! doc.length )
                return cb ? cb({name: 'NotFound'}) : self.errors({name: 'NotFound'});

            if(obj.qt != 'distinct') { // distinct query için çevrim yapmıyoruz
                self.formatFrom(doc);
                self.mask('get', doc);
            }
        }
        // qtype == findcount için sonuçları ayrı ayrı self.from'dan geçiriyoruz
        else if(doc && hasOwnProperty.call(doc, 'rows')) {
            self.formatFrom(doc.rows);
            self.mask('get', doc.rows);
        }
        else if(doc && hasOwnProperty.call(doc, 'count')) {
            // do not anything
        }
        // qtype == one için self.from'dan geçiriyoruz
        else if(type == '[object Object]') {
            self.from(doc);
            doc = self.maskOne('get', doc);
        }
        else
            return cb ? cb({name: 'NotFound'}) : self.errors({name: 'NotFound'});
        
        cb ? cb(null, doc) : self._http.OK({doc: doc}, self._res);
        obj = self = type = null;
    });
};

// promise for cache stampede
Schema.prototype.getPromise = function (obj, self) {
    return new Promise(function(resolve, reject) {
        self.getFunc(obj, self, function(err, doc) {
            err ? reject(err) : resolve(doc);
        });
    });
};

/**
 * ----------------------------------------------------------------
 * Routes
 * ----------------------------------------------------------------
 */

Schema.prototype.get = function (obj, options, cb) {
    obj         = this.clone(obj);
    var self    = this;
    var optType = this.type(options);
    
    // options parametresi function olarak geçirilmişse callback olarak bunu seçiyoruz
    var _cb = (optType == '[object Function]') ? options : cb;

    // cache key'i belirliyoruz
    // cache key direkt obje içinde veya options içinde belirtilebilir
    var cacheKey;
    if(obj.cacheKey) {
        cacheKey = obj.cacheKey;
        delete obj.cacheKey;
    }
    else if(optType == '[object Object]')
        cacheKey = options.cacheKey;

    // core cache ve cache key varsa cache'i çalıştırıyoruz
    if(this._app.core.cache && cacheKey) {
        // objeyi ve class'ı cache-stampede içinde kullanılabilmesi için parametre olarak geçiriyoruz
        var params = {params: [obj, self]};
        if(obj.expiry) { // in ms
            params.expiry = obj.expiry;
            delete obj.expiry;
        }

        /**
         * @TODO
         * cacheKey için prefix kullan
         */
        
        this._app.core.cache.cached(cacheKey, this.getPromise, params)
            .then(function(doc) {
                self.log('CACHE', cacheKey);
                _cb ? _cb(null, doc) : self._http.OK({doc: doc}, self._res);
                cacheKey = params = null;
            }, function(err) {
                self._log.error(self._group+':CACHE:'+cacheKey, err);
                self.errors(err, _cb);
                cacheKey = params = null;
            });
    }
    else
        this.getFunc(obj, null, _cb);

    optType = null;
};

Schema.prototype.getById = function (id, cb) {
    var self = this;
    var Item = self._model;
    var cond = {_id: id}; // where conditions

    // set app id for system objects (before Item.findOne)
    if(this._appId) 
        cond.ap = this._appId;

    // set acl owner protection (api response ise owner protection uygula)
    if( ! this._master && this.protect('getid') ) {
        var alias = this._owner.alias;
        var field = this._alias[alias];

        cond[field] = this._user;
    }

    Item.findOne(cond, function (err, doc) {
        if(err)
            return self.errors(err, cb);

        if( ! doc )
            return self.errors({name: 'NotFound'}, cb);

        doc = doc.toJSON();
        self.from(doc);
        doc = self.maskOne('get', doc);

        cb ? cb(null, doc) : self._http.OK({doc: doc}, self._res);
        self = Item = null;
    });
};

Schema.prototype.stream = function (obj, cb) {
    // set stream
    obj    = obj || {};
    obj.qt = 'stream';
    obj    = this.clone(obj);
    
    this._model.q(obj, this._config.query, function(err, stream) {
        cb(null, stream);
    });
};

Schema.prototype.aggregate = function (ops, cb) {
    var self = this;
    var Item = self._model;

    Item.aggregate(ops, function (err, doc) {
        if(err)
            return self.errors(err, cb);

        if( ! doc )
            return self.errors({name: 'NotFound'}, cb);

        cb ? cb(null, doc) : self._http.OK({doc: doc}, self._res);
        self = Item = null;
    });
};

Schema.prototype.post = function (obj, cb) {
    // clone obj
    obj = this.clone(obj);
    this.log('POST:DATA:NAKED', obj);
    
    // execute mask (obje'ye başka field'lar set edilmeden önce yapılması lazım)
    obj = this.maskOne('post', obj);
    obj = obj || {}; // maskOne'dan tamamen null dönerse aşağıda hata atmaması için kontrol ediyoruz
    this.log('POST:DATA:MASKED', obj);
    this._res.setHeader('X-AppIo-Post-Data-Masked', JSON.stringify(obj));
    
    // set app id for system objects (before this.to)
    if(this._appId)
        obj.apps = this._appId;

    // set acl owner protection (api response ise owner protection uygula)
    if(this.protect('post')) {
        var alias   = this._owner.alias;
        var field   = this._alias[alias];
        var profile = this._owner.profile;

        if( ! this._master )
            obj[alias] = this._user;
        else if( ! obj[alias] )
            obj[alias] = this._user;

        // check profile id
        if(profile && this._profile) {
            if( ! this._master )
                obj[profile.alias] = this._profile;
            else if( ! obj[profile.alias] )
                obj[profile.alias] = this._profile;
        }
    }

    // execute alias converting
    this.to(obj);
    this.log('POST:DATA:CONVERTED', obj);
    
    var self = this;
    
    this.validate(this._save, obj, function(err, result) {
        if(result.error.length)
            return self.errors({name: 'ValidationError', errors: result.error}, cb);

        var Item = new self._model(obj);

        Item.save(function(err, doc) {
            if(err)
                return self.errors(err, cb);

            if(doc) {
                doc = doc.toJSON();
                self.from(doc);
                self.toS3(doc._id);
            }

            cb ? cb(null, doc) : self._http.Created({doc: doc}, self._res);
            self = Item = null;
        });
    });
};

Schema.prototype.put = function (id, obj, cb) {
    var where = false;

    if(this.type(id) == '[object Object]' && id.where)
        where = id.where;

    var self  = this;
    var Item  = this._model;
    var a     = [];
    var unset = null;
    var cond  = {_id: id}; // where conditions

    // allow for only current app
    if(this._appId) {
        var appId = this._appId;

        if(where)
            where.ap = appId;
        else
            cond.ap = appId;
    }

    // set acl owner protection (api response ise owner protection uygula)
    if( ! this._master && this.protect('put') ) {
        if(where)
            where[this._owner.alias] = this._user;
        else
            cond[this._owner.alias] = this._user;
    }

    obj = this.clone(obj);
    this.log('PUT:DATA:NAKED', obj);
    
    // parse params
    a.push(function(cb) {
        try {
            parser(obj, function(err, parsed) {
                var ops = [
                    '$set',
                    '$unset',
                    '$inc', // number field
                    '$pushAll', // array field
                    '$addToSet', // array field
                    '$pull', // array field
                    '$pullAll' // array field
                ];

                // change properties alias with key
                if(parsed) {
                    _.each(ops, function(value, key) {
                        if(parsed[value]) {
                            // execute mask
                            parsed[value] = self.maskOne('put', parsed[value]);
                            self.log(':PUT:DATA:MASKED:'+value, parsed[value]);
                            self.to(parsed[value], true); // keepEmpty = true     
                        }
                    });

                    // unset'in sanitization'dan geçmemesi lazım, burada kaldırıyoruz
                    if(parsed.$unset) {
                        unset = parsed.$unset;
                        delete parsed.$unset;
                    }
                }

                if(err)
                    err = {name: 'ParserError', message: err};

                self.log('PUT:DATA:PARSED', parsed);
                cb(err, parsed, unset);
            });
        }
        catch(err) {
            cb({name: 'ParserError', message: err});
        }
    });

    // validate
    a.push(function(parsed, unset, cb) {
        self.validate(self._update, parsed, function(err, result) {
            if(result.error.length)
                return cb({name: 'ValidationError', errors: result.error});

            // unset varsa ekliyoruz
            if(parsed && unset)
                parsed.$unset = unset;

            cb(err, parsed);
        });
    });

    // check item
    if( ! where ) {
        a.push(function(parsed, cb) {
            Item.findOne(cond, function (err, doc) {
                if( ! doc )
                    return cb({name: 'NotFound'});

                cb(err, parsed, doc);
            });
        });
    }

    async.waterfall(a, function(err, parsed, doc) {
        if(err)
            return self.errors(err, cb);

        /**
         * protect app id
         * (unset durumunda unset edilebilmesi için ap = '' geldiği için property kontrolü yapıyoruz)
         */
        if(self._appId && parsed.$set && parsed.$set.hasOwnProperty('ap'))
            delete parsed.$set.ap;

        if(self._appId && parsed.$unset && parsed.$unset.hasOwnProperty('ap'))
            delete parsed.$unset.ap;

        // set acl owner protection (api response ise owner protection uygula)
        if( ! self._master && self.protect('put') ) {
            var alias   = self._owner.alias;
            var field   = self._alias[alias];
            var profile = self._owner.profile;

            if(parsed.$set && parsed.$set.hasOwnProperty(field))
                delete parsed.$set[field];

            if(parsed.$unset && parsed.$unset.hasOwnProperty(field))
                delete parsed.$unset[field];

            // check profile id
            if(profile) {
                var pField = self._alias[profile.alias];

                if (parsed.$set && parsed.$set.hasOwnProperty(pField))
                    delete parsed.$set[pField];

                if (parsed.$unset && parsed.$unset.hasOwnProperty(pField))
                    delete parsed.$unset[pField];
            }
        }

        // eğer where koşulu varsa koşula göre update ediyoruz (multi = true)
        if(where) {
            Item.update(where, parsed, {multi: true}, function(err, raw) {
                if(err) return self.errors(err, cb);
                cb ? cb(null, raw.nModified) : self._http.OK({affected: raw.n, modified: raw.nModified}, self._res);
                self = Item = a = unset = null;
            });
        }
        // eğer sadece set işlemi yapıyorsak, doc.save çalıştıracağız (hook'ların vs çalışması için)
        else if(Object.keys(parsed).length == 1 && parsed.$set) {
            doc._original = _.clone(doc.toJSON()); // set original doc for post.save hook

            _.each(parsed.$set, function(value, key) {
                var type  = self.type(value);
                var fType = self._save.properties[key].ftype;
                
                // object id = '' gelirse mongoose cast hatası atıyor, null'e eşitliyoruz
                if( ! value && fType == 'objectid')
                    value = null;

                // eğer object id = [''] gelirse mongoose cast hatası atıyor, array'e eşitliyoruz
                else if(type == '[object Array]' && value.length && value[0] == '' && fType == 'objectid')
                    value = [];

                doc[key] = value;
            });

            doc.save(function (err) {
                if(err) return self.errors(err, cb);
                cb ? cb(null, 1) : self._http.OK({affected: 1}, self._res);
                self = Item = a = unset = null;
            });
        }
        else {
            Item.update(cond, parsed, function(err, raw) {
                if(err) return self.errors(err, cb);
                cb ? cb(null, raw.nModified) : self._http.OK({affected: raw.n, modified: raw.nModified}, self._res);
                self = Item = a = unset = null;
            });
        }
    });
};

Schema.prototype.remove = function (id, cb) {
    var self = this;
    var Item = this._model;
    var cond = {_id: id}; // where conditions

    // set app id for system objects (before Item.findOne)
    if(this._appId)
        cond.ap = this._appId;

    // set acl owner protection (api response ise owner protection uygula)
    if( ! this._master && this.protect('remove') ) {
        var alias = this._owner.alias;
        var field = this._alias[alias];

        cond[field] = this._user;
    }

    this.log('REMOVE:CONDITIONS', cond);
    
    Item.findOne(cond, function (err, doc) {
        if(err)
            return self.errors(err, cb);

        if( ! doc )
            return self.errors({name: 'NotFound'}, cb);

        // soft delete
        if(self._schemaOpts.softdelete) {
            doc.ide = 'Y'; // use this field name for soft delete
            doc.save(function (err) {
                if(err) return self.errors(err, cb);
                cb ? cb(null) : self._http.NoContent(null, self._res);
            });
        }
        // materialized şema'da children document'ları da silmesi için Remove fonksiyonunu kullanmalıyız
        else if(typeof Item.Remove == 'function') {
            Item.Remove(cond, function (err) {
                if(err) return self.errors(err, cb);
                cb ? cb(null) : self._http.NoContent(null, self._res);
            });
        }
        else {
            doc.remove(function (err) {
                if(err) return self.errors(err, cb);
                cb ? cb(null) : self._http.NoContent(null, self._res);
            });
        }
    });
};

Schema.prototype.search = function (query, options, cb) {
    var self = this;
    var Item = this._model;

    Item.search(query || {}, options || {}, function(err, doc) {
        var hits = [], type, total = 0;

        if(doc) {
            type  = self.type(doc.hits.hits);
            hits  = doc.hits.hits;
            total = doc.hits.total;

            if(type == '[object Array]') {
                if( ! hits.length )
                    return cb ? cb({name: 'NotFound'}) : self.errors({name: 'NotFound'}, cb);

                _.each(hits, function(value, key) {
                    self.from(value);
                    dot.put(hits, key+'', value);
                });
            }
        }

        cb ? cb(null, {hits: hits, total: total}) : self._http.OK({doc: hits, total: total}, self._res);
    });
};

Schema.prototype.to = function (obj, keepEmpty) {
    var self  = this;
    keepEmpty = keepEmpty || false;

    _.each(obj, function(value, key) {
        // boş değerleri uçuruyoruz, aksi halde optional = true olan field'lar için type hatası veriyor
        if(php.empty(value) && ! keepEmpty )
            return delete obj[key];

        if( ! self._alias[key] )
            return;

        // change alias with key
        var realKey = self._alias[key]; // alias'ın gerçek key karşılığını alıyoruz (field_one => pf.fo gibi)
        var props   = dot.get(self._save, 'properties.'+realKey) || // standart object properties
                      dot.get(self._save, 'properties.'+realKey.replace('.', '.properties.')); // nested object properties

        // obje'den alias'ı uçuruyoruz
        delete obj[key];

        if(dot.get(props, 's3'))
            dot.put(self._s3, key, value); // save to s3
        // gerçek key'i obje'ye yazıyoruz
        else
            dot.put(obj, realKey, value); // save to db

        realKey = props = null;

        // eğer value "array of objects" şeklinde geldiyse obje'lerin herbirini self.to'dan geçiriyoruz
        if(self.type(value) == '[object Array]') {
            _.each(value, function(aVal, aKey) {
                if(self.type(aVal) == '[object Object]') {
                    self.to(aVal);
                }
            });
        }
    });

    return this;
};

Schema.prototype.toS3 = function (file) {
    var self = this;

    /**
     * @TODO
     * file'ın yanına s3 objesini parametre olarak al, override etme ihtimaline karşı this._s3 yerine parametre kullan
     */
    
    if(Object.keys(this._s3).length) {
        var config = this._app.config[this._env].aws;

        var client = knox.createClient({
            key    : config.account.key,
            secret : config.account.secret,
            bucket : config.bucket
        });

        var string = JSON.stringify(this._s3);

        var req = client.put('/dev/'+file+'.json', {
            // 'Content-Length': string.length, // hatalı uzunluk veriyor ve obje eksik kaydediliyor
            'Content-Length' : new Buffer(string).length, // bu şekilde kullan
            'Content-Type'   : 'application/json'
        });

        req.on('response', function(res){
            if (200 == res.statusCode)
                self.log('S3:URL', req.url);
        });

        req.end(string);
    }

    this._s3 = {};

    return this;
};

Schema.prototype.from = function (doc, name, parent) {
    var self  = this;
    var model = name ? this.getModel(name) : this._model;
    name      = name || this._name;
    var save  = model.schema.inspector.Save;

    _.each(doc, function(value, key) {
        // _id key'ine ve materialized ile ilgili key'lere dokunma
        if( ['_id', 'parentId', 'path', 'depth'].indexOf(key) >= 0 )
            return;

        // remove hidden fields
        if(key[0] == '_' || key == 'id')
            return delete doc[key];

        // original key
        var org = key;

        // parent key varsa orjinal key ile birleştir
        if(parent)
            key = parent+'.'+key;

        var props = false, alias = false, refs = false, remove = false;

        // change key with alias
        if(key == 'children') {
            props  = true;
            refs   = name;
            remove = false; // alias ile değiştiremediğimiz için silmiyoruz
            alias  = 'children';
        }
        else {
            props = dot.get(save, 'properties.'+key) || // "standart object" props
                    dot.get(save, 'properties.'+key.replace('.', '.properties.')) || // "nested object" props
                    dot.get(save, 'properties.'+key.replace('.', '.items.properties.')); // "array of objects" props
            refs  = self._refs[key];

            if(props)
                alias = props.alias;

            remove = (alias != key); // alias ve key birbirinden farklıysa obje'den uçur
        }

        if( ! props ) {
            props = alias = refs = remove = null;
            return;
        }

        // check denormalized field
        var from = dot.get(save, 'properties.'+key+'.from');
        if(from) {
            _.each(value, function(fval, fkey) {
                self.from(fval, from);
            });
        }

        // get value type
        var vType = self.type(value);

        // replace options values
        if(dot.get(props, 'settings.options')) {
            for(o in props.settings.options) {
                var curr = props.settings.options[o];

                /**
                 * @TODO
                 * [object Array] için de orjinal değeri göster
                 */

                if(vType == '[object Array]') {
                    for(v in value) {
                        if(value[v] == curr.value) {
                            value[v] = curr.label;
                            break;
                        }
                    }
                }
                else {
                    if(value == curr.value) {
                        dot.put(doc, alias+'_v', value); // show original value
                        value = curr.label;
                        break;
                    }
                }
            }
        }

        // doc[alias] a eşitleyeceğimiz değeri klonluyoruz
        // klonlamazsak objelerin referansı yüzünden sıkıntı çıkıyor
        value = refs ? JSON.parse(JSON.stringify(value)) : value; // _.clone populate edilmeyen object id'leri bozuyor

        // change key with alias
        if(alias)
            doc[alias] = value;

        // populate fields
        if(refs) {
            if(vType == '[object Array]') {
                _.each(value, function(refval, refkey) {
                    if(refval._id) // sonuçlar populate edilmediyse çevrim yapmıyoruz
                        self.from(refval, refs);
                });
            }
            else if(vType == '[object Object]' && value._id) // sonuçlar populate edilmediyse çevrim yapmıyoruz
                self.from(value, refs);
        }
        else if(vType == '[object Object]') // process "nested object"
            self.from(value, null, key);
        else if(vType == '[object Array]') { // process "array of objects"
            _.each(value, function(aVal, aKey) {
                if(self.type(aVal) == '[object Object]')
                    self.from(aVal, null, key);
            });
        }

        // remove original key
        if(remove)
            delete doc[org];

        props = alias = refs = remove = null;
    });

    model = save = null;
};

Schema.prototype.validate = function (schema, obj, cb) {
    var self = this;
    // console.log(obj);
    // console.log(schema.properties.$set);

    /**
     * @TODO
     * default value sahibi olan property'lerde optional = true bile olsa default value ekliyor, update durumunda sıkıntı olur
     * update objesinden def silinebilir
     */

    // sanitize
    inspector.sanitize(schema, obj, self._sanitize, function (err, result) {
        // console.log('[Schema sanitize:obj]');
        // console.log(obj);

        // validate
        inspector.validate(schema, obj, self._validate, function (err, result) {
            // console.log('[Schema validate:obj]');
            // console.log(obj);
            // console.log('[Schema validate:result]');
            // console.log(result);

            cb(err, result);
        });
    });
};

module.exports = function(app) {
    return Schema;
};
