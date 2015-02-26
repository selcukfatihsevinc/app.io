var _   = require('underscore');
var dot = require('dotty');

// speed up calls
var hasOwnProperty = Object.prototype.hasOwnProperty;

function Inspector(schema) {
    this._schema    = schema || {};
    this._mongoose  = {}; // mongoose schema
    this._alias2key = {}; // alias-key object
    this._save      = {}; // inspector save properties
    this._update    = {}; // inspector update properties
    this._refs      = {}; // model references

    return this;
}

Inspector.prototype.type = function(value) {
    return Object.prototype.toString.call(value);
};

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
        clone[key].optional = true;
        // delete clone[key]['$empty'];
    });

    _update[operation].properties = props || clone;
};

Inspector.prototype.init = function() {
    var self = this;

    _.each(this._schema, function(value, key) {
        var curr = value;
        var arr  = (self.type(curr) == '[object Array]');

        if(arr)
            curr = curr[0];

        if( ! curr.type || ! curr.alias )
            return;

        if( ! self._mongoose[key] )
            self._mongoose[key] = {};

        if( ! self._save[key] )
            self._save[key] = {};

        // get type name
        var type = curr.type.name.toLowerCase();

        /**
         * save properties
         */

        var _save = self._save[key];

        // set alias and code
        _save.alias = curr.alias;
        _save.code  = curr.alias;
        self._alias2key[curr.alias] = key;

        var items, objId;

        // inspector'da array için type=array ve items prop lazım (items=string) gibi
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

        // set unique
        if(self.type(curr.unique) == '[object Boolean]')
            _save.unique = curr.unique;

        // set pattern
        if(curr.match) {
            try {
                new RegExp(curr.match);
                _save.pattern = curr.match;
            }
            catch(e) {
                delete value.match;
            }
        }
        else if(curr.pattern && (type == 'string' || items == 'string')) // pattern string alanlarda kullanılabiliyor
            _save.pattern = curr.pattern;

        // length
        if(type == 'string' || type == 'array') {
            if(curr.minLength)
                _save.minLength = curr.minLength;

            if(curr.maxLength)
                _save.maxLength = curr.maxLength;

            if(curr.exactLength)
                _save.exactLength = curr.exactLength;
        }

        // numbers
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

        // save to s3
        if(curr.s3)
            _save.s3 = true;

        // mongoose
        self._mongoose[key] = value;
    });

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
        Save   : Save,
        Update : Update,
        Refs   : self._refs,
        Alias  : self._alias2key
    };

    return {
        Mongoose : self._mongoose,
        Base     : Schema
    };
};

module.exports = function(app) {
    return Inspector;
};
