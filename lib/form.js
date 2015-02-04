var async = require('async');
var dot   = require('dotty');
var _     = require('underscore');

_.mixin(require('safe-obj'));

// speed up calls
var hasOwnProperty = Object.prototype.hasOwnProperty;

function Form(name, options) {
    this._name    = name;  // form name
    this._data    = false; // form data
    this._error   = false; // form errors
    this._props   = false; // save properties
    this._fields  = false; // form fields
    this._options = options || {}; // form options
    this._prefix  = '';    // form field ajax prefix
    this._cb      = false; // callback

    return this;
}

Form.prototype.init = function () {
    // app
    this._req  = arguments[0];
    this._app  = this._req.app;
    this._res  = arguments[1];
    this._next = arguments[2];

    // base model
    this._model = this.getModel(this._name);

    if( ! this._model )
        return this;

    // schema
    this._alias  = this._model.schema.inspector.Alias;
    this._save   = this._model.schema.inspector.Save;
    this._update = this._model.schema.inspector.Update;
    this._refs   = this._model.schema.inspector.Refs;

    // set default fields
    this._props  = this._save.properties;
    this._fields = Object.keys(this._props);

    return this;
};

Form.prototype.type = function(value) {
    return Object.prototype.toString.call(value);
};

Form.prototype.getModel = function (name) {
    name = name.toLowerCase();
    name = name.replace('_', '.');
    return dot.get(this._app.model, name);
};

Form.prototype.data = function(data) {
    // form data'sına geçirirken lean bile olsa object id'ler nesne olarak gidiyor, clone'lamamız lazım
    this._data = JSON.parse(JSON.stringify(data));
    return this;
};

Form.prototype.error = function (error) {
    this._error = error;
    return this;
};

// object url prefix for field requests
Form.prototype.prefix = function (prefix) {
    this._prefix = prefix;
    return this;
};

Form.prototype.render = function (fields, cb) {
    try {
        if( ! this._model || ! cb )
            return cb(true);

        fields   = fields || this._fields;
        this._cb = cb;
        var self = this;
        var f    = {};

        if(this.type(fields) != '[object Array]')
            return cb(true);

        _.each(fields, function(field, key) {
            field = self._alias[field] ? self._alias[field] : field;

            if( ! self._props[field] )
                return;

            // check field initial status
            var initial = dot.get(self._props[field], 'settings.initial');

            if( self.type(initial) == '[object Boolean]' && ! initial )
                return;

            f[field] = self._props[field];
            f[field].prefix = self._prefix;
        });

        if(Object.keys(f).length)
            return this.fields(f);

        cb(true);
    }
    catch(e) {
        console.log(e);
    }
};

Form.prototype.fields = function (fields) {
    var self = this;
    var a    = {};

    // ftype: field type
    var ftype, tpl, ref;

    _.each(fields, function(field, key) {
        ftype = dot.get(field, 'settings.field') || field.type;
        ftype = ftype.toLowerCase();

        var nested = false;
        if(field.ref) {
            ref    = self.getModel(field.ref);
            nested = ref.schema.inspector.Options.nested;
        }

        if(nested)
            tpl = 'nested';
        else if(field.ref)
            tpl = 'relation';
        // eq tanımlı alanlar için selectbox kullanıyoruz,
        // multiple alıp almayacağına (type=array ise) template'de karar veriyor
        else if(self.type(field.eq) == '[object Array]')
            tpl = 'select';
        else if(ftype == 'string')
            tpl = 'text';
        else if(ftype == 'textarea')
            tpl = 'textarea';
        else if(ftype == 'richtext')
            tpl = 'richtext';
        else if(ftype == 'boolean')
            tpl = 'checkbox';
        else if(ftype == 'number')
            tpl = 'number';
        else if(ftype == 'date')
            tpl = 'date';
        else if(ftype == 'array')
            tpl = 'array';
        else
            tpl = 'text';

        (function(a, tpl, field, key) {
            a[key] = function(cb) {
                var obj = {
                    name  : self._name,
                    key   : key,
                    field : field,
                    data  : self._data[key] || false,
                    opts  : self._options
                };

                if(field.ref)
                    obj.ref = self.getModel(field.ref);

                // uses express render
                new self._app.lib.field(self._app, tpl, obj, cb);

                // clear vars
                obj = null;
            };
        })(a, tpl, field, key);
    });

    var keys = Object.keys(a);

    async.parallel(a, function(err, results) {
        if(err)
            console.log(err);

        var output = '';

        // parallel çalıştığı için key sırasına göre sıralama değişmeden output üretmemiz lazım
        // direkt async result'ını join edemeyiz
        if(results) {
            _.each(keys, function(key, index) {
                if(results[key])
                    output += results[key];
            });
        }

        // form response object
        var resp = {
            doc: output
        };

        if(self._error)
            resp.error = self._error;

        self._cb(err, output);
    })
};

module.exports = function(app) {
    return Form;
};
