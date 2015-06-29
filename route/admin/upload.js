var multiparty = require('multiparty');
var cloudinary = require('cloudinary');
var fs         = require('fs');
var stream     = require('stream');
var php        = require('phpjs');
var dot        = require('dotty');
var AWS        = require('aws-sdk');
var _          = require('underscore');

module.exports = function(app) {

    var _env    = app.get('env');
    var _log    = app.system.logger;
    var _form   = app.lib.form;
    var _schema = app.lib.schema;

    app.post('/admin/upload', function(req, res, next) {
        try {
            if( ! req.session.app )
                return res.json({});

            var conf = app.config[_env].app.config.upload;

            if( ! conf ) {
                _log.info('upload conf not found');
                return res.json({});
            }

            var type = conf.type;

            // set basedir for local upload
            conf.basedir = app.get('basedir');

            new app.lib.upload(req, conf).handle(function(err, fields, files) {
                if(err) {
                    _log.info(err);
                    return res.sendStatus(422);
                }

                // save system.images
                files.forEach(function(file) {
                    var obj = {
                        apps: req.session.app._id,
                        users: req.session.user._id,
                        name: file.name,
                        upload_type: 'A',
                        bytes: file.size
                    };

                    if(type == 'local') {
                        obj.type = 'L';
                        obj.url  = obj.path = file.url.replace(app.get('basedir')+'/public', '');
                    }
                    else if(type == 's3') {
                        obj.type = 'S';
                        obj.url  = file.url;
                        obj.path = file.path;
                    }
                    else if(type == 'cloudinary') {
                        obj.type = 'C';
                        obj.url  = file.url;
                        obj.path = file.path;
                    }

                    new _schema('system.images').init(req, res, next).post(obj, function(err, doc) {
                        if(doc)
                            _log.info('image saved');
                    });
                });

                res.json({});
            });
        }
        catch(e) {
            _log.error(e);
            res.end();
        }
    });

};


