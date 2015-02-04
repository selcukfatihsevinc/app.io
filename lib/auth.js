var validator = require('validatorjs');
var crypto    = require('crypto');
var dot       = require('dotty');

function Auth() {

}

/**
 * @TODO
 * views, rules vs. her şeyi config'e bağla
 */

function hash(passwd, salt) {
    return crypto.createHmac('sha256', salt).update(passwd).digest('hex');
};

Auth.prototype.loginForm = function(req, res, next) {
    if(req.session.userId)
        return res.redirect('/admin');

    res.render('admin/auth/login');
};

Auth.prototype.login = function(req, res, next) {
    if(req.session.userId)
        return res.redirect('/admin');

    var rules = {
        email    : 'required|email',
        password : 'required|min:4|max:32',
    };

    var validation = new validator(req.body, rules);

    if(validation.fails()) {
        return res.render('admin/auth/login', {
            error: true,
            message: validation.errors.all()
        });
    }

    var _schema = req.app.lib.schema;

    new _schema('system.users').init(req, res, next).get({
        email: req.body.email,
        ty: 'A',
        ie: 'Y',
        qt: 'one'
    },
    function(err, doc) {
        if( ! doc ) {
            return res.render('admin/auth/login', {
                error: true,
                message: {
                    email: 'Email not found'
                }
            });
        }

        if( doc.hash != hash(req.body.password, doc.salt) ) {
            return res.render('admin/auth/login', {
                error: true,
                message: {
                    password: 'Wrong password'
                }
            });
        }

        req.session.userId = doc._id.toString();
        res.redirect('/admin');
    });
};

Auth.prototype.logout = function(req, res, next) {
    req.session.destroy();
    res.redirect('/admin/login');
};

Auth.prototype.signup = function(req, res, next) {

};

Auth.prototype.verify = function(req, res, next) {

};

module.exports = function(app) {
    return new Auth();
};
