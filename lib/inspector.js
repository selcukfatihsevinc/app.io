var _   = require('underscore');
var dot = require('dotty');

// speed up calls
var hasOwnProperty = Object.prototype.hasOwnProperty;

function Inspector(schema, alias) {
    this._schema    = schema || {};
    this._alias     = alias || {};
    this._alias2key = {}; // alias-key object
    this._key2alias = {}; // key-alias object
    this._save      = {}; // inspector save properties
    this._update    = {}; // inspector update properties
    this._refs      = {}; // model references

    return this;
}

Inspector.prototype.type = function(value) {
    return Object.prototype.toString.call(value);
};

/**
 * @TODO
 * sadece ilk seviye property'ler için çalışıyor
 * number ve array için update operatör'lerini belirliyor
 * mesela şemada nested object veya array of objects için şu anda $inc veya $addToSet validation'dan geçmez
 */
Inspector.prototype.optypes = function(type, obj) {
    var types = {};
    _.each(obj, function(value, key) {
        if(value.type == type)
            types[key] = value;
    });
    return types;
};

Inspector.prototype.operator = function(operation, _update, _save, props) {
    _update[operation] = {
        type       : 'object',
        alias      : operation,
        code       : operation,
        strict     : true,
        optional   : true,
        properties : {}
    };

    // underscore clone burada işe yaramıyor
    var clone = JSON.parse(JSON.stringify(_save));

    // update işlemi için zorunlu alan olmayacak
    _.each(clone, function(value, key) {
        /**
         * @TODO
         * "$empty" property'si de uçurulabilir
         * (delete clone[key]['$empty'] gibi)
         */

        // nested object property'ler için field'larda optional = true set ediyor
        if(value.properties) {
            _.each(value.properties, function(pvalue, pkey) {
                dot.put(clone, key+'.properties.'+pkey+'.optional', true);

                /**
                 * @TODO
                 * .def property'si uçurulacak, test et öyle koy
                 */
            });
        }
        // array of objects property'ler için field'larda optional = true set ediyor
        else if(dot.get(value, 'items.properties')) {
            _.each(value.items.properties, function(ivalue, ikey) {
                dot.put(clone, key+'.items.properties.'+ikey+'.optional', true);

                /**
                 * @TODO
                 * .def property'si uçurulacak, test et öyle koy
                 */
            });
        }
        // diğer property'ler için optional = true set ediyor
        else {
            clone[key].optional = true;
            delete clone[key].def; // update işleminde def property'sini kaldırıyoruz
            delete clone[key].$empty; // update işleminde $empty property'sini kaldırıyoruz
        }
    });

    _update[operation].properties = props || clone;
};

Inspector.prototype.process = function(schema, parent, ptype) {
    var self = this;
    schema   = schema || this._schema;

    _.each(schema, function(value, key) {
        var curr = value;
        var arr  = (self.type(curr) == '[object Array]');
        var obj  = (self.type(curr) == '[object Object]');

        // "nested object" için schema-inspector'da object olarak işaretliyoruz
        // ve obje'yi parent key ile beraber tekrar process ediyoruz
        if(obj && self._alias[key]) {
            dot.put(self._save, key, {
                type: 'object',
                strict: true,
                properties: {},
                optional: true,
                settings: self._schema[key].settings,
                alias: self._alias[key],
                code: self._alias[key]
            });

            delete self._schema[key].settings;
            return self.process(value, key, 'object');
        }

        // "array of objects" için schema-inspector'da array olarak işaretliyoruz
        // ve obje'yi parent key ile beraber tekrar process ediyoruz
        if(arr && self._alias[key]) {
            dot.put(self._save, key, {
                type: 'array',
                optional: true,
                settings: self._schema[key].settings,
                alias: self._alias[key],
                code: self._alias[key],
                items: {
                    type: 'object',
                    strict: true,
                    properties: {}
                },
            });

            delete self._schema[key].settings;
            self._alias2key[self._alias[key]] = key;
            self._key2alias[key] = self._alias[key];

            return self.process(value[0], key, 'array');
        }

        /**
         * get properties
         */
        var props;

        // "nested object" için properties key'ini belirliyoruz
        if(ptype == 'object')
            props = parent+'.properties.'+key;

        // "array of objects" için properties key'ini belirliyoruz
        if(ptype == 'array')
            props = parent+'.items.properties.'+key;

        // "nested object" için key'i parent'ı ile birleştiriyoruz
        if(parent && ptype == 'object')
            key = parent+'.'+key;

        // şemada array olarak belirtilen property'ler için object'in kendisini alıyoruz
        if(arr)
            curr = curr[0];

        // type veya alias belirtilmemişse dahil etme
        if( ! curr.type || ! curr.alias )
            return;

        if( ! dot.get(self._save, props || key) )
            dot.put(self._save, props || key, {});

        /**
         * get type name
         */
        var type = curr.type.name.toLowerCase();

        /**
         * save properties
         */
        var _save = dot.get(self._save, props || key);

        // set type
        _save.ftype = type;

        // set alias and code
        _save.fname = key;
        _save.alias = curr.alias;
        _save.code  = curr.alias;
        self._alias2key[curr.alias] = key;
        self._key2alias[key] = curr.alias;

        var items, objId;

        // inspector'da array için type=array ve items property lazım (items=string) gibi
        if(arr) {
            items = type;
            type  = 'array';
        }

        // objectid array'ler için items=string olmalı
        if(items == 'objectid') {
            objId = true;
            items = 'string';
        }

        // type=objectid için type=string olarak değiştirilmeli
        if(type == 'objectid') {
            objId = true;
            type  = 'string';
        }

        // set type
        _save.type = type;

        // set object id
        if(objId) {
            _save.$objectid = true;
            _save.ref       = curr.ref;
            self._refs[key] = _save.ref.toLowerCase();
        }

        // set items
        if(items) {
            _save.items = {
                type  : items,
                // items için de validation hatalarında alias gözükmesi için alias ve code set ediyoruz
                alias : curr.alias,
                code  : curr.alias
            };
        }

        // set settings
        if(curr.settings)
            _save.settings = curr.settings;
        else
            _save.settings = {initial: false};

        // set optional
        if(self.type(curr.required) == '[object Boolean]')
            _save.optional = ! curr.required;
        else if(self.type(curr.optional) == '[object Boolean]')
            _save.optional = curr.optional;
        else
            _save.optional = true;

        // eğer optional değilse empty kontrolü yapacak custom validation'u ekliyoruz
        if( ! _save.optional )
            _save.$empty = true;

        // custom sanitization methods
        if( ! curr.allow_html )
            _save.$html = true;

        // set unique
        if(self.type(curr.unique) == '[object Boolean]')
            _save.unique = curr.unique;

        var _attrs = items ? _save.items : _save;
        
        // set pattern
        if(curr.match) {
            try {
                new RegExp(curr.match);
                _attrs.pattern = curr.match;
            }
            catch(e) {
                delete curr.match;
            }
        }
        else if(curr.pattern && (type == 'string' || items == 'string')) // pattern string alanlarda kullanılabiliyor
            _attrs.pattern = curr.pattern;

        // length
        if(type == 'string' || type == 'array') {
            if(curr.minLength)
                _save.minLength = curr.minLength;

            if(curr.maxLength)
                _save.maxLength = curr.maxLength;

            if(curr.exactLength)
                _save.exactLength = curr.exactLength;
        }

        // number properties
        if(type == 'number') {
            if(curr.min)
                _save.min = curr.min;

            if(curr.max)
                _save.max = curr.max;

            if(curr.lt)
                _save.lt = curr.lt;

            if(curr.lte)
                _save.lte = curr.lte;

            if(curr.gt)
                _save.gt = curr.gt;

            if(curr.gte)
                _save.gte = curr.gte;

            if(curr.ne)
                _save.ne = curr.ne;
        }

        // equal
        if( ['array', 'string', 'number', 'boolean'].indexOf(type) >= 0 ) {
            // öncelikli olarak settings.options'u dikkate alıyoruz, {key: value} şeklinde select box oluşturabileceğimiz için
            if(dot.get(curr, 'settings.options')) {
                if(curr.settings.options.length) {
                    _save.eq = _.map(curr.settings.options, function(item) {
                        return item.label && item.value ? item.value : item;
                    });
                }
            }
            else if(self.type(curr.enum) == '[object Array]')
                _save.eq = curr.enum;
            else if(curr.eq)
                _save.eq = curr.eq;
        }

        // default (short id için default kontrolü yapma, string beklerken function geleceği için hata atar)
        if(curr.default && ! curr.short )
            _save.def = curr.default;

        // set rules
        if(curr.rules)
            _save.rules = curr.rules;
        else
            _save.rules = 'trim';

        // set pair
        if(curr.pair)
            _save.pair = curr.pair;

        // set owner
        if(curr.owner)
            _save.owner = curr.owner;
        
        // set flexible reference
        _save.flex_ref = curr.flex_ref ? true : false;

        // set owner
        if(curr.entity_acl)
            _save.entity_acl = curr.entity_acl;

        // set belongs to
        if(curr.belongs_to)
            _save.belongs_to = curr.belongs_to;
        
        // save to s3
        if(curr.s3)
            _save.s3 = true;

        if(curr.from)
            _save.from = curr.from;
    });
};

Inspector.prototype.init = function() {
    var self = this;

    // process schema
    this.process();

    // Save object
    var Save = {
        type       : 'object',
        strict     : true,
        optional   : false,
        properties : self._save
    };

    /**
     * update operators
     */

    self.operator('$set', self._update, self._save);
    self.operator('$unset', self._update, self._save);

    // numbers
    var numbers = self.optypes('number', self._save);
    if(Object.keys(numbers).length)
        self.operator('$inc', self._update, numbers);

    // arrays
    var arrays = self.optypes('array', self._save);

    if(Object.keys(arrays).length) {
        self.operator('$pushAll', self._update, arrays);
        // array of objects şimdilik desteklenmeyecek
        // self.operator('$pull', self._update);
        self.operator('$pullAll', self._update, arrays);

        // addToSet için $each operatörü ekliyoruz
        var arrClone = JSON.parse(JSON.stringify(arrays));
        var arrObj;

        _.each(arrClone, function(arrVal, arrKey) {
            arrObj = {
                type: 'object',
                strict: false,
                optional: true,
                properties: {
                    '$each': arrVal
                }
            };

            arrClone[arrKey] = arrObj;
        });

        self.operator('$addToSet', self._update, arrClone);
    }

    // Update object
    var Update = {
        type       : 'object',
        strict     : false,
        optional   : false,
        properties : self._update
    };

    /**
     * schema object
     */

    var Schema = {
        Save     : Save,
        Update   : Update,
        Refs     : self._refs,
        Alias    : self._alias2key,
        KeyAlias : self._key2alias,
    };

    return Schema;
};

module.exports = function(app) {
    return Inspector;
};
