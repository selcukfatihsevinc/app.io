var async = require('async');
var uuid  = require('node-uuid');
var dot   = require('dotty');
var fs    = require('fs');
var _     = require('underscore');

function ApiDocs(app, cb) {
    this._app = app;
    this._cb  = cb;
    this._doc = '';
    this._tmp = {};
    this._postman = {
        development: {
            id: '80174f90-0b87-11e5-972f-49339284f65c'
        },
        production: {
            id: '80179dc8-0b87-11e5-972f-49339284f65c'
        }
    };
    
    this.basic();
    this.postman();
    
    return this;
}

ApiDocs.prototype.basic = function() {
    var self = this;

    async.parallel({
        endpoints: function(cb) {
            self._app.render(__dirname+'/endpoints', function(err, html) {
                cb(err, html);
            });
        },
        get_query: function(cb) {
            self._app.render(__dirname+'/get_query', function(err, html) {
                cb(err, html);
            });
        },
        put_query: function(cb) {
            self._app.render(__dirname+'/put_query', function(err, html) {
                cb(err, html);
            });
        }
    }, function(err, results) {

        self.credentials();
        self._doc += results.endpoints;
        self.generate();
        self._doc += results.get_query;
        self._doc += results.put_query;

        fs.writeFile(self._app.get('basedir')+'/README.md', self._doc, function(err) {
            console.log('documentation file saved!');
        });

        self._cb();
    });
};

ApiDocs.prototype.credentials = function() {
    var self = this;
    
    _.each(self._app.apidocs.config, function(value, key) {
        self._doc += '# '+value.name+'\n\n';
        
        _.each(value.env, function(e_value, e_key) {
            self._doc += '## '+e_value.apidocs.env+'\n\n';

            self._doc += '### Url\n';
            self._doc += '> **`'+e_value.apidocs.baseurl+'`**\n\n';
            
            self._doc += '### API Credentials\n';
            self._doc += '> **`Client Id`** '+e_value.apidocs.client_id+'  \n';
            self._doc += '**`Client Secret`** '+e_value.apidocs.client_secret+'  \n\n';
        });
    });
};


ApiDocs.prototype.generate = function() {
    var self  = this;
    var h_sys = false;
    var h_app = false;

    _.each(this._app.model, function(value, key) {

        if(['acl', 'oauth'].indexOf(key) != -1)
            return;

        if( ! h_sys && key == 'system') {
            self._doc += '# API Endpoints [System]\n\n';
            h_sys = true;
        }
        else if( ! h_app ) {
            self._doc += '# API Endpoints ['+self._app.apidocs.config[key].name+']\n\n';
            h_app = true;
        }

        _.each(value, function(m_value, m_key) {
            if( ! m_value.schema.inspector )
                return;

            self._doc += '### /api/o/'+key+'.'+m_key+'\n';
            self._doc += '**`headers`** ';
            self._doc += 'X-Access-Token';

            if(key == 'system')
                self._doc += ', X-Client-Id, X-Client-Secret';

            self._doc += '\n\n';

            var save = m_value.schema.inspector.Save.properties;

            _.each(save, function(f_value, f_key) {
                // console.log(f_value);
                self._doc += '>**`'+f_value.alias+'`** ';
                self._doc += f_value.ftype;

                if( ! f_value.optional )
                    self._doc += ', required';

                if(f_value.ref)
                    self._doc += ', ref: '+f_value.ref.toLowerCase().replace('_', '.');

                if(f_value.settings.options) {
                    self._doc += ', {';
                    _.each(f_value.settings.options, function(o_value, o_key) {
                        self._doc += o_value.value+': '+o_value.label;

                        if(f_value.settings.options[o_key+1])
                            self._doc += ', ';
                    });
                    self._doc += '}';
                }

                if(key == 'system' && f_value.alias == 'apps')
                    self._doc += ', auto generated';

                self._doc += '  \n';
            });

            self._doc += '\n\n';
        });

    });
};

// push api endpoints
ApiDocs.prototype.endpoints = function(baseurl, collection_id, client) {
    var resp_arr = [];
    var login_id = uuid.v1();
    
    // api login 
    resp_arr.push({
        collectionId: collection_id,
        id: login_id,
        headers: 'X-Client-Id:'+client.id+' \nX-Client-Secret:'+client.secret+' \n',
        url: baseurl+'/api/login',
        method: 'POST',
        data: [
            {key: 'email', value: '', type: 'text', enabled: true},
            {key: 'password', value: '', type: 'text', enabled: true}
        ],
        dataMode: 'urlencoded',
        version: 2,
        name: 'api.login',
        description: ''
    });
    
    // /api/token get
    // /api/forgot post 
    // /api/reset/:token get
    // /api/reset/:token post 
    // /api/invite post
    // /api/invite/:token get
    // /api/invite/:token post
    // /api/register post
    // /api/verify/:token get
    // /api/verify/:token post
    // /api/change_password post 
    
    return resp_arr;
};

ApiDocs.prototype.postman = function() {
    var self = this;
    var obj  = {
        version: 1,
        collections: [],
        environments: [],
        headerPresets: [],
        globals: []
    };
    
    _.each(self._app.apidocs.config, function(c_value, c_key) {

        // collections loop (environments)
        _.each(c_value.env, function(e_value, e_key) {
            var coll_id  = self._postman[e_key].id || uuid.v1();
            var coll_obj = {
                id: coll_id,
                name: e_value.apidocs.collection,
                folders: [],
                requests: []
            }
            
            var endpoints = self.endpoints(e_value.apidocs.baseurl, coll_id, {
                id: e_value.apidocs.client_id,
                secret: e_value.apidocs.client_secret
            });
            
            if(endpoints.length) {
                _.each(endpoints, function(endpoint) {
                    coll_obj.requests.push(endpoint);
                });    
            }
            
            // requests loop
            _.each(self._app.model, function(value, key) {
                
                _.each(value, function(m_value, m_key) {

                    if( ! m_value.schema.inspector )
                        return;

                    // folders
                    var folder_id  = uuid.v1();
                    var folder_obj = {
                        id: folder_id,
                        name: key+'.'+m_key,
                        description: '',
                        write: true,
                        collection_name: e_value.apidocs.collection,
                        collection_id: coll_id,
                        collection: coll_id,
                        order: [],
                        owner: 0,
                        collection_owner: 0
                    }

                    coll_obj.folders.push(folder_obj);

                    // requests
                    _.each(['GET', 'POST', 'PUT', 'DELETE'], function(method) {
                        var req_id  = uuid.v1();
                        var req_obj = {
                            collectionId: coll_id,
                            id: req_id,
                            headers: 'X-Access-Token: \n',
                            url: e_value.apidocs.baseurl+'/api/o/'+key+'.'+m_key,
                            method: method,
                            data: [],
                            dataMode: '',
                            version: 2,
                            name: key+'.'+m_key,
                            description: '',
                            folder: folder_id,
                            owner: 0
                        }

                        // push to folder order
                        folder_obj.order.push(req_id);

                        if(key == 'system')
                            req_obj.headers += 'X-Client-Id: '+e_value.apidocs.client_id+'\nX-Client-Secret: '+e_value.apidocs.client_secret+'\n';
                        
                        if(method == 'PUT' || method =='DELETE')
                            req_obj.url += '/:id';
                        
                        if(method == 'POST' || method == 'PUT')
                            req_obj.dataMode = 'urlencoded'
                        else if(method == 'GET')
                            req_obj.dataMode = 'params';
                        
                        // data loop
                        var save = m_value.schema.inspector.Save.properties;
                        var get  = [];
                        
                        _.each(save, function(f_value, f_key) {
                            var data_obj = {
                                key: f_value.alias,
                                value: '',
                                type: 'text',
                                enabled: true
                            };

                            if(method == 'GET')
                                get.push(f_value.alias+'=');
                            else
                                req_obj.data.push(data_obj);
                        });

                        if(method == 'GET')
                            req_obj.url += '?'+get.join('&');
                        
                        coll_obj.requests.push(req_obj);                        
                    });
                    
                });
                
            });
            
            obj.collections.push(coll_obj);
        });
        
    });

    fs.writeFile(self._app.get('basedir')+'/postman.json', JSON.stringify(obj, null, 2), function(err) {
        console.log('postman file saved!');
    });
    
};

module.exports = function(app) {
    return ApiDocs;
};
