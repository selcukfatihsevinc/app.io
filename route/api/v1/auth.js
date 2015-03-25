var Validator = require('validatorjs');
var crypto    = require('crypto');
var jwt       = require('jwt-simple');

module.exports = function(app) {

    var _env    = app.get('env');
    var _schema = app.lib.schema;
    var _conf   = app.config[_env].api; // api config
    var _resp   = app.system.response.app;

    var _hash = function(passwd, salt) {
        return crypto.createHmac('sha256', salt).update(passwd).digest('hex');
    };

    var _expiresIn = function(numDays) {
        var dateObj = new Date();
        return dateObj.setDate(dateObj.getDate()+numDays);
    };

    var _genToken = function(user, days) {
        var expires = _expiresIn(days);
        var token   = jwt.encode({exp: expires, user: user}, _conf.token.secret);

        return {
            token   : token,
            expires : expires
        };
    };

    /**
     * Login
     */

    app.post('/auth/login', function(req, res, next) {
        res.apiResponse = true;

        var rules = {
            email    : 'required',
            password : 'required'
        };

        var validation = new Validator(req.body, rules);

        if(validation.fails()) {
            next( _resp.UnprocessableEntity({
                type   : 'ValidationError',
                errors : validation.errors.all()
            }));
        }
        else {
            new _schema('system.users').init(req, res, next).get({email: req.body.email, qt: 'one'}, function(err, doc) {
                if( ! doc ) {
                    return next( _resp.Unauthorized({
                        type   : 'InvalidCredentials',
                        errors : ['email not found']}
                    ));
                }

                if( doc.hash === _hash(req.body.password, doc.salt) )
                    _resp.OK( _genToken({_id: doc._id}, _conf.token.expires) , res);
                else {
                    next( _resp.Unauthorized({
                        type   : 'InvalidCredentials',
                        errors : ['wrong password']
                    }));
                }
            });
        }
    });

};