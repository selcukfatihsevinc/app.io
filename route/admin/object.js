var async  = require('async');
var extend = require('extend');
var dot    = require('dotty');
var qs     = require('qs');
var _      = require('underscore');
_.s        = require('underscore.string');

module.exports = function(app) {

    var _env    = app.get('env');
    var _log    = app.system.logger;
    var _form   = app.lib.form;
    var _schema = app.lib.schema;
    var _jobs   = app.boot.kue;
    var _conf   = app.config[_env].admin; // admin config
    var _system = [
        'oauth.clients',
        'system.accounts',
        'system.actions',
        'system.filters',
        'system.images',
        'system.invites',
        'system.objects',
        'system.roles'
    ];

    var _inspector = function(req, redirect) {
        var o = req.params.object;

        // app seçilmese de system.apps işlemleri yapılabilsin
        if( ! req.session.app && o != 'system.apps' )
            return false;

        var m = dot.get(req.app.model, o);

        if( ! m ) {
            redirect = redirect || true;

            if(redirect) {
                req.flash('flash', {
                    type: 'danger',
                    message: _.s.titleize(o)+' not found'
                });
            }

            return false;
        }

        m = _.clone(m);
        return dot.get(m, 'schema.inspector');
    };

    // admin main page
    app.get('/admin', function(req, res, next) {
        // console.log(req.session);
        
        if(req.session.user)
            return res.render('admin/page/index');

        var a = {
            u: function(cb) {
                new _schema('system.users').init(req, res, next).get({_id: req.session.adminUserId, qt: 'one'}, function(err, doc) {
                    cb(err, doc);
                });
            },
            r: function(cb) {
                req.app.acl.userRoles(req.session.adminUserId, function(err, roles) {
                    req.app.acl.whatResources(roles, function(err, resources) {
                        cb(err, resources);
                    });
                });
            },
            a: function(cb) {
                new _schema('system.apps').init(req, res, next).get({sort: 'name'}, function(err, doc) {
                    cb(err, doc)
                });
            }
        };

        async.parallel(a, function(err, results) {
            // if(results)
            //    console.log(results);

            var render = true;

            if(err)
                _log.info(err);
            else if( ! results.u )
                _log.info('user data not found');
            else if(results.u.type != 'Admin')
                _log.info('user type is not admin'); // type = Admin olanların girişine izin veriyoruz
            else if( ! results.a )
                _log.info('apps data not found');
            else
                render = false;

            if(render)
                return res.render('admin/page/index');

            // set user session data
            req.session.user = results.u;

            // set apps session data
            req.session.apps = {};
            _.each(results.a, function(value, key) {
                req.session.apps[value._id.toString()] = value;

                if(value.slug == 'system')
                    req.session.systemApp = value;
            });

            // set resources session data
            req.session.resources = {};
            if(results.r) {
                var sorted = Object.keys(results.r).sort();
                var obj    = {};

                _.each(sorted, function(value, key) {
                    var sortedArr = value.split('_');
                    var modelName = value.replace('_', '.');

                    // eğer model aktif değilse resource'u alma
                    if( ! dot.get(req.app.model, modelName) )
                        return;

                    if(sortedArr.length > 1) {
                        if( ! obj[sortedArr[0]] )
                            obj[sortedArr[0]] = {};

                        obj[sortedArr[0]][sortedArr[1]] = results.r[value];
                    }
                });

                req.session.resources = obj;
                console.log(obj);
            }

            res.render('admin/page/index');
        });
    });

    // select app
    app.get('/admin/app/:id', function(req, res, next) {
        var app = dot.get(req.session, 'apps.'+req.params.id);

        if(app)
            req.session.app = app;

        res.redirect('back');
    });

    // object list
    app.get('/admin/o/:object', function(req, res, next) {
        var o    = req.params.object;
        var insp = _inspector(req);

        if( ! insp )
            return res.redirect('/admin');

        try {
            var filterForm = dot.get(insp, 'Forms.filter') || false;

            var a = {
                form: function(cb) {
                    // get filter form
                    new _form(o, {filter: true}).init(req, res, next).prefix('/admin/p/').render(filterForm, function(err, form) {
                        cb(null, form);
                    });
                },
                filters: function(cb) {
                    // get filters
                    new _schema('system.filters').init(req, res, next).get({
                        users: req.session.user._id,
                        object: o
                    }, function(err, filters) {
                        cb(null, filters);
                    });
                }
            }

            if(o == 'system.images') {
                a['upload'] = function(cb) {
                    // render upload box
                    app.render('admin/upload/box', {object: o}, function(err, upload) {
                        cb(null, upload);
                    });
                }
            }

            async.parallel(a, function(err, results) {
                if(err)
                    _log.error(err);

                // render page
                res.render('admin/object/list', {
                    object  : o,
                    opts    : insp.Options,
                    props   : insp.Save.properties,
                    alias   : insp.Alias,
                    sfilter : results.form,
                    filters : results.filters,
                    search  : insp.Searchable,
                    upload  : results.upload
                });
            });
        }
        catch(e) {
            _log.error(e.stack);
            res.redirect('/admin');
        }
    });

    // empty form
    app.get('/admin/o/:object/new', function(req, res, next) {
        var o        = req.params.object;
        var insp     = _inspector(req);
        var nocreate = dot.get(insp, 'Options.nocreate');

        if( ! insp || nocreate )
            return res.redirect('/admin');

        try {
            var newForm = dot.get(insp, 'Forms.new') || false;

            new _form(o).init(req, res, next).prefix('/admin/p/').render(newForm, function(err, form) {
                if(err)
                    _log.error(err);

                res.render('admin/object/new', {
                    action : 'save',
                    opts   : insp.Options,
                    form   : form,
                    err    : err,
                    object : o
                });
            });
        }
        catch(e) {
            _log.error(e.stack);
            res.redirect('/admin');
        }
    });

    // form for sub object (array of objects) 
    app.post('/admin/form/:object/:alias/:index?', function(req, res, next) {
        var o    = req.params.object;
        var insp = _inspector(req);

        if( ! insp )
            return res.redirect('/admin');

        var alias = req.params.alias;
        var index = parseInt(req.params.index);
        var id    = req.query.id;
        
        try {
            if(id) {
                var field = insp.Alias[alias];
                var addForm = function(_form, a, o, alias, index, data) {
                    a.push(function(cb) {
                        new _form(o, {object: alias, index: index, data: data}).init(req, res, next).prefix('/admin/p/').render(false, function(err, form) {
                            if(form)
                                form = '<div class="col-md-4"><div class="well"><a href="javascript:void(0)" type="button" class="close" aria-label="Close" onclick="closeObjectItem(this);"><span aria-hidden="true">&times;</span></a>'+form+'</div></div>';
                            
                            cb(null, form);
                        });
                    });  
                };   
                
                new _schema(o, {format: false}).init(req, res, next).getById(id, function(err, doc) {
                    // concat forms by index and data
                    if(doc[field] && doc[field].length) {
                        var a = [];
                        var i = 0;
                        _.each(doc[field], function(val) {
                            addForm(_form, a, o, alias, i, val);
                            i++;
                        });
                     
                        async.series(a, function(err, results) {
                            var response = '';
                            
                            if(results && results.length)
                                response = results.join(' ');
                            
                            res.json({index: i, html: response});
                        });
                    }
                    else
                        res.json({html: ''});
                });
            }
            else {
                new _form(o, {object: alias, index: index}).init(req, res, next).prefix('/admin/p/').render(false, function(err, form) {
                    res.send(form);
                });                
            }
        }
        catch(e) {
            _log.error(e.stack);
            res.redirect('/admin');
        }
    });
    
    // get nested view
    app.get('/admin/o/:object/nested', function(req, res, next) {
        var o        = req.params.object;
        var insp     = _inspector(req);

        if( ! insp )
            return res.redirect('/admin');

        try {
            var parentId = req.query.parentId || '{null}';
            var obj      = {
                parentId: parentId,
                sort: 'order'
            }

            // istenecek field'lar (relation, nested vs. field'larda bütün data'yı çekmesin )
            if(insp.Options.columns)
                obj.f = insp.Options.columns.join(',');

            // default 10 tane getiriyor, 1000 tane göster
            obj.l = 1000;

            // get children
            new _schema(o).init(req, res, next).get(obj, function(err, children) {
                if(err)
                    _log.error(err);

                res.render('admin/object/partial/list/nested', {
                    children : children,
                    opts     : insp.Options,
                    parentId : parentId
                });
            });
        }
        catch(e) {
            _log.error(e.stack);
            res.redirect('/admin');
        }
    });

    // update nested data
    app.put('/admin/o/:object/nested/:id', function(req, res, next) {
        var o        = req.params.object;
        var insp     = _inspector(req);

        if( ! insp )
            return res.redirect('/admin');

        try {
            var obj = {};
            if(req.body.order)
                obj.order = req.body.order;

            if(req.body.parentId) {
                if(req.body.parentId == 'root')
                    obj.parentId = '';
                else
                    obj.parentId = req.body.parentId;
            }

            new _schema(o).init(req, res, next).put(req.params.id, obj, function(err, children) {
                if(err)
                    _log.error(err);

                res.json({});
            });
        }
        catch(e) {
            _log.error(e.stack);
            res.redirect('/admin');
        }
    });

    app.get('/admin/o/:object/save', function(req, res, next) {
        res.redirect('/admin/o/'+req.params.object+'/new');
    });

    // save form data
    app.post('/admin/o/:object/save', function(req, res, next) {
        var o        = req.params.object;
        var insp     = _inspector(req);
        var nocreate = dot.get(insp, 'Options.nocreate');

        if( ! insp || nocreate )
            return res.redirect('/admin');

        try {
            // set app id
            // if(_system.indexOf(o) != -1)
            req.body.apps = req.session.app._id;

            // set user id
            if(o == 'system.filters')
                req.body.users = req.session.user._id;

            new _schema(o).init(req, res, next).dateFormat().post(req.body, function(err, doc) {
                if(err)
                    _log.error(err);

                if( ! err && doc ) {
                    req.flash('flash', {type: 'success', message: _.s.titleize(o)+' saved'});
                    return res.redirect('/admin/o/'+o);
                }

                var newForm = dot.get(insp, 'Forms.new') || false;

                new _form(o).init(req, res, next).prefix('/admin/p/').data(req.body).render(newForm, function(formErr, form) {
                    if(formErr)
                        _log.error(formErr);

                    res.render('admin/object/new', {
                        action : 'save',
                        opts   : insp.Options,
                        form   : form,
                        err    : err || formErr,
                        object : o
                    });
                });
            });
        }
        catch (e) {
            _log.error(e.stack);
            res.redirect('/admin');
        }
    });

    // edit form
    app.get('/admin/o/:object/edit/:id', function(req, res, next) {
        var o      = req.params.object;
        var id     = req.params.id;
        var insp   = _inspector(req);
        var noedit = dot.get(insp, 'Options.noedit');

        if( ! insp || noedit )
            return res.redirect('/admin');

        try {
            // params
            var params = {
                _id: req.params.id,
                qt: 'one'
            };

            // set app id
            if(_system.indexOf(o) != -1)
                params.apps = req.session.app._id;

            // set user id
            if(o == 'system.filters')
                params.users = req.session.user._id;

            new _schema(o, {format: false}).init(req, res, next).get(params, function(err, doc) {
                if(err)
                    _log.error(err);

                if( err || ! doc ) {
                    req.flash('flash', {type: 'danger', message: _.s.titleize(o)+' not found'});
                    return res.redirect('/admin/o/'+o);
                }

                var editForm = dot.get(insp, 'Forms.edit') || dot.get(insp, 'Forms.new') || false;

                new _form(o, {edit: true}).init(req, res, next).prefix('/admin/p/').data(doc).render(editForm, function(err, form) {
                    if(err)
                        _log.error(err);

                    res.render('admin/object/new', {
                        action : 'update',
                        opts   : insp.Options,
                        id     : id,
                        form   : form,
                        err    : err,
                        object : o
                    });
                });
            });
        }
        catch (e) {
            _log.error(e.stack);
            res.redirect('/admin');
        }
    });

    app.get('/admin/o/:object/update/:id', function(req, res, next) {
        res.redirect('/admin/o/'+req.params.object+'/edit/'+req.params.id);
    });

    // update form data
    app.post('/admin/o/:object/update/:id', function(req, res, next) {
        var o      = req.params.object;
        var id     = req.params.id;
        var insp   = _inspector(req);
        var noedit = dot.get(insp, 'Options.noedit');

        if( ! insp || noedit )
            return res.redirect('/admin');

        try {
            // set app id
            if(_system.indexOf(o) != -1)
                req.body.apps = req.session.app._id;

            // set user id
            if(o == 'system.filters')
                req.body.users = req.session.user._id;

            new _schema(o).init(req, res, next).dateFormat().put(id, req.body, function(err, doc) {
                if(err)
                    _log.error(err);

                if( ! err || doc ) {
                    req.flash('flash', {type: 'success', message: _.s.titleize(o)+' updated'});
                    return res.redirect('/admin/o/'+o);
                }

                var editForm = dot.get(insp, 'Forms.edit') || dot.get(insp, 'Forms.new') || false;

                new _form(o, {edit: true}).init(req, res, next).prefix('/admin/p/').data(req.body).render(editForm, function(formErr, form) {
                    if(formErr)
                        _log.error(formErr);

                    res.render('admin/object/new', {
                        action : 'update',
                        opts   : insp.Options,
                        id     : id,
                        form   : form,
                        err    : err || formErr,
                        object : o
                    });
                });
            });
        }
        catch (e) {
            _log.error(e);
            res.redirect('/admin');
        }
    });

    function deleteIds(id, req, res, next) {
        return function(cb) {
            new _schema(req.params.object).init(req, res, next).remove(id, function(err, doc) {
                cb(err, doc);
            });
        };
    }

    // remove ids
    app.get('/admin/o/:object/remove/:ids', function(req, res, next) {
        var o        = req.params.object;
        var ids      = req.params.ids;
        var insp     = _inspector(req);
        var nodelete = dot.get(insp, 'Options.nodelete');

        if( ! insp || nodelete )
            return res.redirect('/admin');

        try {
            ids = ids.split(',');

            if( ! ids.length )
                return res.redirect('/admin/o/'+o);

            var a = [];

            for(i in ids) {
                if(ids.hasOwnProperty(i))
                    a.push(deleteIds(ids[i], req, res, next));
            }

            async.parallel(a, function(err, results) {
                if(err)
                    _log.error(err);

                req.flash('flash', {type: 'success', message: _.s.titleize(o)+' removed'});
                res.redirect('/admin/o/'+o);
            });
        }
        catch (e) {
            _log.error(e.stack);
            res.redirect('/admin');
        }
    });

    // enable item
    app.get('/admin/o/:object/enable', function(req, res, next) {
        var o    = req.params.object;
        var ids  = req.query.ids;
        var insp = _inspector(req);

        if( ! insp )
            return res.redirect('/admin');

        try {
            if(ids)
                ids = ids.split(',');
            else
                return res.redirect('/admin/o/'+o);

            var params = {where:
                {_id: {$in: ids}}
            };

            new _schema(o).init(req, res, next).put(params, {is_enabled: 'Y'}, function(err, doc) {
                if(err)
                    _log.error(err);

                req.flash('flash', {type: 'success', message: _.s.titleize(o)+' enabled'});
                res.redirect('/admin/o/'+o);
            });
        }
        catch (e) {
            _log.error(e.stack);
            res.redirect('/admin');
        }
    });

    app.get('/admin/o/:object/build-index', function(req, res, next) {
        var o    = req.params.object;
        var ids  = req.query.ids;
        var insp = _inspector(req);

        if( ! insp || ! insp.Searchable )
            return res.redirect('/admin');

        _jobs.create('set-index-job', {
            title: 'Set '+o+' index job',
            params: {
                type   : 'set-index-job',
                object : o
            }
        }).attempts(3).save();

        req.flash('flash', {type: 'success', message: _.s.titleize(o)+' index is building'});
        res.redirect('/admin/o/'+o);
    });

    /**
     * REST API proxies
     */

    // object list
    app.get('/admin/p/:object', function(req, res, next) {
        var o    = req.params.object;
        var insp = _inspector(req, false);

        if( ! insp )
            return res.json({});

        try {
            // delete cache key
            delete req.query._;

            // set app id
            if(_system.indexOf(o) != -1)
                req.query.apps = '{in}'+req.session.app._id;

            // system.actions için sistem objelerine erişim izni olabilir
            if(req.query.apps && o == 'system.objects' && req.session.systemApp)
                req.query.apps += ','+req.session.systemApp._id.toString();

            // istenecek field'lar (relation, nested vs. field'larda bütün data'yı çekmesin )
            if(insp.Options.columns)
                req.query.f = insp.Options.columns.join(',');

            // obje sayısı 10'dan fazla olabilir
            req.query.limit = 1000;

            new _schema(o).init(req, res, next).get(req.query, function(err, doc) {
                if(err)
                    _log.error(err);

                res.json(doc || {});
            });
        }
        catch (e) {
            _log.error(e.stack);
            res.redirect('/admin');
        }
    });

    // object table data
    app.get('/admin/p/:object/table', function(req, res, next) {
        var insp = _inspector(req, false);

        if( ! insp )
            return res.json({total: 0, rows: 0});

        try {
            var o = req.params.object;
            var q = req.query || {};
            var p = {};

            // remove ajax params
            if(q['_']) dot.remove(q, '_');
            
            // set app id
            if(req.session.app && _system.indexOf(o) != -1)
                p.apps = req.session.app._id;

	        // check apps for system.users
	        if(req.session.app && o == 'system.users') {
	            var modelName = req.session.app.slug+'.profiles';
		        var mProfile  = dot.get(req.app.model, modelName);
		     
		        if(mProfile)
			        p.apps = req.session.app._id;
	        }
	        
            // set user id
            if(req.session.user && o == 'system.filters')
                p.users = req.session.user._id;

            // query type
            p.qt = 'findcount';

            if(q.limit) {
                p.l = q.limit;
                dot.remove(q, 'limit');
            }
            
            if(q.offset) {
                p.sk = q.offset;
                dot.remove(q, 'offset');
            }

            if(q.search) {
                p[insp.Options.main] = '{:like:}'+q.search;
                dot.remove(q, 'search');
            }

            if(q.sort) {
                p.s = q.sort;
                dot.remove(q, 'sort');
                
                if(q.order == 'desc') {
                    p.s = '-'+p.s;
                    dot.remove(q, 'order');
                }
            }
            else if(insp.Options.sort)
                p.s = insp.Options.sort;

            // remove order param
            if(q.order) 
                dot.remove(q, 'order');
            
            if(insp.Options.columns) {
                var extra;
                if(insp.Options.extra)
                    extra = insp.Options.extra.join(',');

                // istenecek field'lar
                p.f = insp.Options.columns.join(',');

                if(extra)
                    p.f += ','+extra;

                // istenecek field'lar içinde populate edilecek field'lar var mı kontrol ediyoruz
                var populate = [];

                // columns'a sırayla bakıyoruz
                for(col in insp.Options.columns) {
                    if(insp.Options.columns.hasOwnProperty(col)) {
                        var currCol = insp.Options.columns[col];

                        // field alias'ının karşılık geldiği bir field key var mı kontrol ediyoruz
                        if(insp.Alias[currCol]) {
                            // key'e karşılık gelen referans var mı kontrol ediyoruz
                            var currRef = insp.Refs[ insp.Alias[currCol] ];

                            // bu key'e karşılık gelen bir referans varsa direkt key'i gönderiyoruz
                            if(currRef)
                                populate.push(insp.Alias[currCol]);
                        }
                    }
                }

                if(populate.length)
                    p.p = populate.join(',');
            }

            // decode filters
            var filter;
            if(q.filter) {
                filter = app.lib.base64.decode(q.filter);
                filter = qs.parse(filter);
                p      = extend(p, filter);
                dot.remove(q, 'filter');
            }

            // apply other query parameters
            if(Object.keys(q).length)
                p = extend(p, q);

            // execute query
            new _schema(o).init(req, res, next).get(p, function(err, doc) {
                if(err)
                    _log.error(err);

                o = q= p = filter = null;

                if( err || ! doc )
                    return res.json({total: 0, rows: 0});

                res.json(doc);
            });
        }
        catch (e) {
            _log.error(e.stack);
            res.redirect('/admin');
        }
    });

    // get object

    /*
     app.get('/admin/p/:object/:id', function(req, res, next) {
         var insp = _inspector(req, false);

         if( ! insp )
            return res.json({});

         try {
             // set access token
             var access_token = req.session.access_token;

             new _r().get('get_object', _o+req.params.object+'/'+req.params.id+'?access_token='+access_token).exec(function(err, body) {
                res.json(dot.get(body, 'get_object.data.doc'));
             });
         }
         catch (e) {
             _log.error(e.stack);
             res.redirect('/admin');
         }
     });
     */

    /**
     * filter functions
     */

    // filter form
    // [ajax]
    app.get('/admin/f/:object/:id', function(req, res, next) {
        var o    = req.params.object;
        var insp = _inspector(req);

        if( ! insp )
            return res.json({err: true});

        try {
            var a = {};

            a['get_filter'] = function(cb) {
                new _schema('system.filters').init(req, res, next).get({_id: req.params.id, qt: 'one'}, function(err, doc) {
                    cb(err, doc);
                });
            }

            a['filters'] = function(cb) {
                new _schema('system.filters').init(req, res, next).get({
                    apps: req.session.app._id,
                    users: req.session.user._id,
                    object: o
                }, function(err, filters) {
                    cb(err, filters);
                });
            }

            async.parallel(a, function(err, results) {
                if(err) {
                    _log.error(err);
                    return res.json({err: true});
                }

                // decode filter
                var filter;
                try {
                    filter = app.lib.base64.decode(results['get_filter'].filter);
                    filter = qs.parse(filter);
                }
                catch (e) {}

                _log.info('load filter: ', filter);

                var filterForm = dot.get(insp, 'Forms.filter') || false;

                new _form(o, {filter: true}).init(req, res, next).prefix('/admin/p/').data(filter).render(filterForm, function(err, form) {
                    if(err)
                        _log.error(err);

                    res.render('admin/layout/filter', {
                        sfilter: form,
                        filters: results['filters']
                    });
                });
            });
        }
        catch(e) {
            _log.error(e.stack);
            res.json({err: true});
        }
    });

    // save filter
    // [ajax]
    app.post('/admin/f/:object', function(req, res, next) {
        var o    = req.params.object;
        var insp = _inspector(req);

        if( ! insp )
            return res.json({err: true});

        try {
            req.body.apps  = req.session.app._id; // set app id
            req.body.users = req.session.user._id; // set user id

            new _schema('system.filters').init(req, res, next).post(req.body, function(err, doc) {
                if(err)
                    _log.error(err);

                if( ! err && doc )
                    return res.json({err: false});

                res.json({err: true, detail: err});
            });
        }
        catch (e) {
            _log.error(e.stack);
            res.json({err: true});
        }
    });

};