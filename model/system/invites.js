var async  = require('async');
var crypto = require('crypto');
var uuid   = require('node-uuid');
var php    = require('phpjs');
var dot    = require('dotty');
var _      = require('underscore');

module.exports = function(app) {

    var _env      = app.get('env');
    var _log      = app.system.logger;
    var _conf     = app.config[_env];
    var _mailer   = app.lib.mailer;
    var mongoose  = app.core.mongo.mongoose;
    var ObjectId  = mongoose.Schema.Types.ObjectId;
    var Inspector = app.lib.inspector;
    var query     = app.lib.query;
    var workerId  = parseInt(process.env.worker_id);
    var emitter   = app.lib.schemaEmitter;

    var Schema = {
        ap  : {type: ObjectId, typeStr: 'ObjectId', required: true, ref: 'System_Apps', alias: 'apps'},
        ir  : {type: ObjectId, typeStr: 'ObjectId', ref: 'System_Users', alias: 'inviter'},
        em  : {type: String, typeStr: 'String', required: true, alias: 'email', pattern: 'email'},
        na  : {type: String, typeStr: 'String', alias: 'name'},
        ca  : {type: Date, typeStr: 'Date', alias: 'created_at', default: Date.now},
        it  : {type: String, typeStr: 'String', required: true, alias: 'invite_token'},
        iex : {type: Date, typeStr: 'Date', required: true, alias: 'invite_expires'},
        dt  : {type: String, typeStr: 'String', required: true, alias: 'detail'},
        es  : {type: String, typeStr: 'String', default: 'Y', enum: ['Y', 'N'], alias: 'email_sent'},
        st  : {type: String, typeStr: 'String', default: 'AC', enum: ['WA', 'AC', 'DC'], alias: 'status'}
    };

    Schema.ap.settings  = {initial: false};
    Schema.em.settings  = {initial: false};
    Schema.na.settings  = {initial: false};
    Schema.ir.settings  = {initial: false};
    Schema.ca.settings  = {initial: false};
    Schema.it.settings  = {initial: false};
    Schema.iex.settings = {initial: false};
    Schema.dt.settings  = {initial: false};
    Schema.es.settings  = {initial: false};

    Schema.st.settings = {
        initial: false,
        options: [
            {label: 'Waiting', value: 'WA'},
            {label: 'Accepted', value: 'AC'},
            {label: 'Declined', value: 'DC'}
        ]
    };

    var inspector  = new Inspector(Schema).init();
    var InviteSchema = app.core.mongo.db.Schema(Schema);

    // plugins
    InviteSchema.plugin(query);

    // inspector
    InviteSchema.inspector = inspector;

    // compound index
    InviteSchema.index({ap: 1, em: 1}, {unique: true});

    // model options
    InviteSchema.inspector.Options = {
        singular : 'System Invite',
        plural   : 'System Invites',
        columns  : ['email'],
        main     : 'email',
        perpage  : 25
    };

    // schema owner
    InviteSchema.inspector.Owner = {
        field : 'ir',
        alias : 'inviter',
        protect : {
            'get': true,
            'getid': true,
            'post': true,
            'put': true
        }
    };

    /**
     * ----------------------------------------------------------------
     * Pre Save Hook
     * ----------------------------------------------------------------
     */

    InviteSchema.pre('save', function (next) {
        var self = this;

        self._isNew = self.isNew;

        next();
    });

    /**
     * ----------------------------------------------------------------
     * Post Save Hook
     * ----------------------------------------------------------------
     */

    InviteSchema.post('save', function (doc) {

        // eğer app için invite moderation aktif ise status değişimine bak, onaylandıysa mail at
        if( ! this._isNew ) {

            // get app data
            var Apps = mongoose.model('System_Apps');

            Apps.findById(doc.ap, function(err, apps) {
                if(err || ! apps)
                    return _log.info('not found app data for system.invites');

                var moderate = dot.get(_conf, 'app.config.'+apps.s+'.auth.invite_moderation');

                if(moderate && doc.es == 'N' && doc.st == 'AC' && doc.it && doc.em) {
                    var mailconf = dot.get(_conf, 'app.mail.'+apps.s);

                    if(mailconf) {
                        var mailObj = mailconf.invite;

                        app.render('email/templates/invite', {
                            baseUrl: mailconf.baseUrl,
                            endpoint: mailconf.endpoints.invite,
                            token: doc.it
                        }, function(err, html) {
                            if(html) {
                                mailObj.to = doc.em;
                                mailObj.html = html;

                                var _transport = app.boot.mailer;
                                new _mailer(_transport).send(mailObj);
                            }
                        });

                        // flag invitation as "sent"
                        doc.es = 'Y';
                        doc.save(function(err) {
                            if(err)
                                return _log.info(err);
                        });
                    }
                }
            });
        }

    });

    /**
     * ----------------------------------------------------------------
     * Superadmin Acl
     * ----------------------------------------------------------------
     */

    // allow superadmin (mongoose connection bekliyor)
    mongoose.connection.on('open', function() {
        if(app.acl && workerId == 0) {
            app.acl.allow('superadmin', 'system_invites', '*');
            _log.info('[acl:allow] superadmin:system_invites:*');
        }
    });

    return mongoose.model('System_Invites', InviteSchema);

};



