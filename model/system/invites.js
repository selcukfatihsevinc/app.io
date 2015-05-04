var async  = require('async');
var crypto = require('crypto');
var uuid   = require('node-uuid');
var php    = require('phpjs');
var _      = require('underscore');

module.exports = function(app) {

    var _log      = app.system.logger;
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
        ca  : {type: Date, typeStr: 'Date', alias: 'created_at', default: Date.now},
        it  : {type: String, typeStr: 'String', required: true, alias: 'invite_token'},
        iex : {type: Date, typeStr: 'Date', required: true, alias: 'invite_expires'}
    };

    Schema.ap.settings = {initial: false};
    Schema.em.settings = {initial: false};
    Schema.ir.settings = {initial: false};
    Schema.ca.settings = {initial: false};
    Schema.it.settings = {initial: false};
    Schema.iex.settings = {initial: false};

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

    // allow superadmin (mongoose connection bekliyor)
    mongoose.connection.on('open', function() {
        if(app.acl && workerId == 0) {
            app.acl.allow('superadmin', 'system_invites', '*');
            _log.info('[acl:allow] superadmin:system_invites:*');
        }
    });

    return mongoose.model('System_Invites', InviteSchema);

};



