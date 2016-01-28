var multiparty = require('multiparty');
var knox       = require('knox');
var multiknox  = require('knox-mpu-alt');
var AWS        = require('aws-sdk');
var mkdirp     = require('mkdirp');
var sizeOf     = require('image-size');

function Upload(req, options) {
    this._req    = req;
    this._opts   = options || {};
    this._target = ['local', 's3', 'cloudinary'];
    this._log    = req.app.system.logger;

    return this;
}

Upload.prototype.handle = function(cb) {
    var type = this._req.get('Content-Type');

    if(type.indexOf('multipart/form-data') == -1)
        return cb({type: 'NotMultipart'});

    if( ! this._opts.type || this._target.indexOf(this._opts.type) == -1)
        return cb({type: 'NotValidTarget'});

    if( ! this._opts.dir && ! this._opts.uploadDir )
        return cb({type: 'NotValidUploadDir'});

    this[this._opts.type](cb);
};

Upload.prototype.local = function(cb) {
    var self      = this;
    var uploadDir = self._opts.uploadDir || self._opts.basedir+'/'+self._opts.dir;
    
    mkdirp(uploadDir, function() {
        var form = new multiparty.Form({
            uploadDir: uploadDir,
            maxFilesSize: self._opts.maxFilesSize || 10485760 // 10mb
        });

        form.parse(self._req, function(err, fields, files) {
            var data = [];

            if(files) {
                files.file.forEach(function(file) {
                    var dimensions = sizeOf(file.path) || {};
                    
                    data.push({
                        url: file.path,
                        size: file.size,
                        name: file.originalFilename,
                        path: file.path,
                        width: dimensions.width,
                        height: dimensions.height,
                        ext: dimensions.type,
                    });
                });
            }

            cb(err, fields, data);
        });        
    });
}

Upload.prototype.s3 = function(cb) {
    var bucket  = this._opts.bucket;
    var folder  = this._opts.folder;
    var headers = {'x-amz-acl': 'public-read'};
    var party   = new multiparty.Form();
    var self    = this;
    var aborted = false;
    var fields  = {};

    var client = knox.createClient({
        key: self._opts.account.key,
        secret: self._opts.account.secret,
        bucket: bucket
    });

    party.on('error', function() {
        cb({type: 'StreamError'});
    });

    party.on('field', function(name, value) {
        fields[name] = value;
    });

    party.on('part', function(part) {
        headers['Content-Type'] = part.headers['content-type'];

        var cbst  = false;
        var multi = new multiknox({
            client: client,
            objectName: folder+'/'+part.filename,
            stream: part,
            headers: headers,
            noDisk: true,
            maxRetries: 0
        },
        function(err, body) {
            self._log.info('body');
            self._log.info(body);

            var data = [];

            if(body) {
                data.push({
                    url: body.Location,
                    size: body.size,
                    name: part.filename,
                    path: '/'+folder+'/'+part.filename
                });
            }

            if( ! cbst ) {
                cbst = true;
                cb(err, fields, data);
            }
        });

        multi.on('error', function(err) {
            self._log.info('multiknox error');
            self._log.error(err);
        });
    });

    party.on('close', function() {
        self._log.info('stream close');
    });

    party.on('aborted', function() {
        self._log.info('stream aborted');
        aborted = true;
    });

    party.parse(this._req);
}

Upload.prototype.cloudinary = function(cb) {
    return cb(true);

    var obj = {files: []};

    try {
        if( php.empty(_cloudinary) ) {
            req.flash('flash', {type: 'danger', message: 'not found cloudinary config'});
            return res.redirect('/admin');
        }

        var party   = new multiparty.Form();
        var cstream = cloudinary.uploader.upload_stream(function(result) {
            if(result.url) {
                result.upload_type = 'A'; // Admin upload
                result.cloud_name  = _cloudinary.cloud_name;

                obj.files.push({
                    url: result.url
                });

                new _schema('cloudinaries').init(req, res, next).post(result, function(err, doc) {
                    if(doc) _log.info('stream saved');
                });
            }

            res.json(obj);
        });

        party.on('error', function() {
            _log.error('stream error');
            res.end();
        });

        party.on('part', function(part) {
            var out = new stream.Writable();

            out._write = function (chunk, encoding, done) {
                cstream.write(chunk); // write to the stream
                done(); // don't do anything with the data
            };

            part.pipe(out);
        });

        party.on('close', function() {
            _log.info('stream close');
            cstream.end();
        });

        party.on('aborted', function() {
            _log.info('stream aborted');
            res.end();
        });

        party.parse(req);
    }
    catch(e) {
        _log.error(e.stack);
        res.end();
    }
}

Upload.prototype.local2s3 = function(path, targetPath, cb) {
    var bucket  = this._opts.bucket;
    var headers = {'x-amz-acl': 'public-read'};
    var self    = this;

    var client = knox.createClient({
        key: self._opts.account.key,
        secret: self._opts.account.secret,
        bucket: bucket
    });

    client.putFile(path, targetPath, function(err, res) {
        cb(err, res);
    });
}

Upload.prototype.s3delete = function(file, cb) {
    var bucket  = this._opts.bucket;
    var headers = {'x-amz-acl': 'public-read'};
    var self    = this;

    var client = knox.createClient({
        key: self._opts.account.key,
        secret: self._opts.account.secret,
        bucket: bucket
    });

    client.deleteFile(file, function(err, res) {
        cb(err, res);
    });
}

module.exports = function(app) {
    return Upload;
};
