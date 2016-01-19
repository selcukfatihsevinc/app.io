var feedparser = require('feedparser');
var request    = require('request');
var async      = require('async');
var read       = require('node-read');
var dot        = require('dotty');
var he         = require('he');
var _          = require('underscore');
_.s            = require('underscore.string');

function FeedParser(app) {
    this._app        = app;
    this._env        = app.get('env');
    this._log        = app.lib.logger;
    this._schema     = app.lib.schema;
    this._done       = null;
    this._redis      = app.core.redis.a;
    this._mongoose   = app.core.mongo.mongoose;
    this._config     = app.config[this._env].feed;
    this._group      = 'FEEDPARSER';
    this._gramophone = app.lib.gramophone;
    
    var stopwords    = app.config[this._env].stopwords;
    this._stopwords  = stopwords.tr.concat(stopwords.en);
    
    return this;
}

/**
 * @TODO
 * config'e enable parametresi koy
 */

FeedParser.prototype.run = function(channelId, done) {
    var self   = this;
    this._done = done;
    
    new this._schema('feed.channels').init(this._app).getById(channelId, function(err, channel) {
        if(err) {
            self._log.error(group, err);
            return done();
        }
        
        if( ! channel ) {
            self._log.error(group, 'channel not found');
            return done();
        }

        if( ! channel.url ) {
            self._log.error(group, 'channel url not found');
            return done();
        }

        self.parse(channel);
    });
};

FeedParser.prototype.parse = function(channel) {
    var self   = this;
    var req    = request(channel.url);
    var parser = new feedparser();
    var group  = this._group+':PARSE';

    req.on('error', function (error) {
        self._log.error(group, error);
        self._done();
    });

    req.on('response', function (res) {
        var stream = this;

        if (res.statusCode != 200) {
            self._log.error(group, 'bad status code');
            return self._done();
        }

        stream.pipe(parser);
    });

    parser.on('error', function(error) {
        self._log.error(group, error);
        self._done();
    });

    // job done!
    parser.on('end', function() {
        console.log('---------- parser end ----------');
        self._done();
    });

    parser.on('readable', function() {
        var stream = this, meta = this.meta, item;

        while (item = stream.read()) {
            self.item(item, channel);
        }
    });
};

FeedParser.prototype.item = function(item, channel) {
    var self     = this;
    var itemurl  = item.origlink || item.link;
    var itemkey  = 'read:url:'+itemurl;
    var appkey   = 'read:url:'+itemurl+':'+channel.apps;
    var terms    = null;
    var termsArr = [];
    var group    = this._group+':ITEM';
    var a        = {};
    
    // get term list
    termsArr.push(item.title);
    
    // get summary
    var summary = item.summary || item.description;
    
    if(summary)
        termsArr.push(_.s.stripTags(summary));

    a['itemKey'] = function(cb) {
        self._redis.get(itemkey, function(err, parsed) {
            cb(null, parsed);
        });
    };
    
    a['appKey'] = function(cb) {
        self._redis.get(appkey, function(err, parsed) {
            cb(null, parsed);
        });
    };

    async.parallel(a, function(err, results) {
        var itemParsed = parseInt(results.itemKey);
        var appParsed  = parseInt(results.appKey);

        // eğer parse edilmiş olarak işaretlendiyse bir daha parse etmiyoruz
        if(appParsed)
            return self._log.info(group, 'app item found!');

        if(itemParsed) {
            self.pushData(appkey, itemurl, channel);
            return self._log.info(group, 'item found!');
        }
        
        if(self._config.readability) {
            // get item page
            request.get(itemurl, function(err, response, body) {
                if(err)
                    return self._log.error(group, err);

                if( ! body )
                    return self._log.error(group, 'body not found');

                read(body, function(err, article, res) {
                    if(err)
                        return self._log.error(group, err);

                    if( ! article )
                        return self._log.error(group, 'article not found!');

                    // set article terms
                    if(article.content)
                        termsArr.push(_.s.stripTags(article.content));

                    terms = self.terms(item, termsArr);
                    self.saveContent(appkey, itemkey, itemurl, item, channel, terms, article.content);
                });
            });
        }
        else {
            terms = self.terms(item, termsArr);
            self.saveContent(appkey, itemkey, itemurl, item, channel, terms);
        }
    });
};

FeedParser.prototype.pushData = function(appkey, url, channel, cb) {
    var Content = this._mongoose.model('Feed_Contents');
    var self    = this;
    var group   = this._group+':PUSHDATA';
    
    // set update
    var obj = {
        ci: channel._id
    };

    if(channel.apps)
        obj.ap = channel.apps;

    if(channel.sources)
        obj.so = channel.sources;
    
    if(channel.categories && channel.categories.length)
        obj.ct = {$each: channel.categories};
    
    Content.update({u: url}, {$addToSet: obj}, function(err, raw) {
        if(err)
            self._log.error(group, err);
        
        if(raw && raw.nModified) {
            Content.findOne({u: url}, function(err, doc) {
                if(doc) {
                    doc.save(function(err) {
                        if( ! err ) {
                            self._redis.set(appkey, 1);
                            self._redis.expire(appkey, 7*86400); // 7 days expire                            
                        }
                        
                        if(cb) cb(err);
                    });                    
                }
                else if(cb) cb(err);
            });            
        }
        else if(cb) cb(err);
    });
    
};

FeedParser.prototype.terms = function(item, termsArr) {
    var content = he.decode(termsArr.join(' '));
    content = content.replace(/'.[^]/g,' '); // remove after apostrophe
    content = content.replace(/‘.[^]/g,' '); // remove after apostrophe
    content = content.replace(/’.[^]/g,' '); // remove after apostrophe
    content = content.replace(/[“”‘’.,-\/#!$%\^&\*;:{}=\-_`~()]/g, ' '); // remove punctation
    content = content.replace(/(^| ).( |$)/g,''); // remove single character
    
    // extract terms
    var terms = this._gramophone.extract(content, {
        html: true,
        limit: 500,
        min: 3,
        score: true,
        stem: false,
        ngrams: [1, 2],
        stopWords: this._stopwords
    });
    
    console.log(terms);
    
    // reset vars
    termsArr = null;

    // get terms
    var termList = _.map(terms, function(obj) {
        return obj.term;
    });

    // tag search'te gelebilmesi için term'leri parçala
    _.each(termList, function(value, key) {
        value = value.split(' ');

        if(value.length > 1)
            termList = value.concat(termList);
    });

    termList = item.categories.concat(termList);
    termList = _.map(termList, function(term) { return term.toLowerCase(); });
    termList = _.uniq(termList);

    // tek karakterli term'leri alma
    termList = _.reject(termList, function(val) {
        return val.length <= 2;
    });

    return {terms: terms, list: termList};
};

FeedParser.prototype.saveContent = function(appkey, itemkey, itemurl, item, channel, terms, content) {
    var self  = this;
    var group = this._group+':SAVE_CONTENT';
    var body  = {
        title        : item.title,
        type         : 'R',
        url          : itemurl,
        summary      : _.s.stripTags(item.summary),
        thumbnail    : item.image.url,
        published_at : item.date,
        tags         : item.categories,
        terms        : terms.list
    };
        
    if(content)
        body.content = content;

    new this._schema('feed.contents').init(this._app).post(body, function(err, content) {
        if(err) {
            self._log.error(group, err);
            return self._done();
        }

        if( ! content ) {
            self._log.error(group, 'content not saved!');
            return self._done();
        }

        // set redis key for url
        self._redis.set(itemkey, 1);
        self._redis.expire(itemkey, 7*86400); // 7 days expire
        self.saveTerms(content, terms, channel, channel.source);
        self.pushData(appkey, itemurl, channel);
    });
};

FeedParser.prototype.saveTerms = function(content, terms, channel, source) {
    var self     = this;
    var group    = this._group+':SAVE_TERMS';
    var keywords = new this._schema('feed.keywords').init(this._app);

    _.each(terms.terms, function(value, key) {
        if(value && value.term.length <= 2)
            return;

        var body = {
            term     : value.term.toLowerCase(),
            freq     : value.tf,
            contents : content._id,
            channels : channel._id
        };
        
        if(source)
            body.sources = source;
        
        if(channel.source)
            body.sources = channel.source;

        keywords.post(body, function(err, content) {
            if(err)
                self._log.error(group, err);
        });
    });
};

module.exports = function(app) {
    return FeedParser;
};
