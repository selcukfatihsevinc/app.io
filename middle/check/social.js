var Validator = require('validatorjs');
var dot       = require('dotty');

function CheckSocial(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;
    var _r      = _app.lib.request;

    // params
    var network = req.body.social_network;
    var token   = req.body.access_token

    // data
    var data = {
        social_network : network,
        access_token   : token
    }

    // validation rules
    var rules = {
        social_network : 'in:github|required',
        access_token   : 'required',
    };

    // validate data
    var validation = new Validator(data, rules);

    if(validation.fails()) {
        return next( _resp.UnprocessableEntity({
            type: 'ValidationError',
            errors: validation.errors.all()
        }));
    }

    var endpoints = {
        github: 'https://api.github.com/user?access_token=:access_token'
    };

    var _email    = req.body.email;
    var _username = req.body.username;
    var endpoint  = endpoints[network];
    endpoint      = endpoint.replace(/:access_token/g, token);

    new _r().get(network, endpoint, {}, {'User-Agent': 'app.io',}).exec(function(err, results) {

        if(network == 'github' && dot.get(results, network+'.code') == 200) {
            var body     = dot.get(results, network+'.body');
            var email    = body.email;
            var username = body.login;

            // eğer verdiği parametrelerle sosyal ağ bilgileri uyuşmuyorsa hata dön
            if( _email != email && _username != username ) {
                return next( _resp.Unauthorized({
                    type: 'InvalidCredentials',
                    errors: ['check user credentials']}
                ));
            }

            req.__social = {
                email : email,
                user  : username,
                name  : body.name
            };

            return next();
        }

        next( _resp.Unauthorized({
            type: 'InvalidCredentials',
            errors: ['check social network credentials']}
        ));
    });

}

module.exports = function(app) {
    return CheckSocial;
};