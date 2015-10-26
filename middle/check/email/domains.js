var addrs = require('email-addresses');
var dot   = require('dotty');

function CheckEmailDomains(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _helper = _app.lib.utils.helper;

    // mail conf
    var _appSlug  = req.__appData.slug;
    var _mailConf = dot.get(req.app.config[_env], 'app.mail.'+_appSlug);
    var _email    = req.body.email;

    if(_mailConf &&
       _helper.type(_mailConf.domains) == '[object Array]' &&
       _mailConf.domains.length
    ) {
        if( ! _email || _email == '' ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['not found email']
            }));
        }

        _email = _email.toLowerCase();
        _email = addrs.parseOneAddress(_email);

        if( ! _email ) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['not found email address']
            }));
        }

        if(_mailConf.domains.indexOf(_email.domain) == -1) {
            return next( _resp.Unauthorized({
                type: 'InvalidCredentials',
                errors: ['not allowed domain']
            }));
        }
    }

    next();

}

module.exports = function(app) {
    return CheckEmailDomains;
};