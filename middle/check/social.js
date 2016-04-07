var Validator = require('validatorjs');
var request   = require('request');
var dot       = require('dotty');
var _         = require('underscore');

function CheckSocial(req, res, next) {

    var _app    = req.app;
    var _env    = _app.get('env');
    var _resp   = _app.system.response.app;
    var _schema = _app.lib.schema;
    var _r      = _app.lib.request;
    var _middle = 'middle.check.social';
    
    // params
    var network = req.body.social_network;
    var token   = req.body.access_token;
    var secret  = req.body.token_secret;
    
    // data
    var data = {
        social_network : network,
        access_token   : token,
        token_secret   : secret
    }

    // validation rules
    var rules = {
        social_network : 'in:github,twitter|required',
        access_token   : 'required',
    };

    if(network == 'twitter')
        rules.token_secret = 'required';
    
    // validate data
    var validation = new Validator(data, rules);

    if(validation.fails()) {
        return next( _resp.UnprocessableEntity({
            middleware: _middle,
            type: 'ValidationError',
            errors: validation.errors.all()
        }));
    }

    var endpoints = {
        github  : 'https://api.github.com/user?access_token=:access_token',
        twitter : 'https://api.twitter.com/1.1/account/verify_credentials.json'
    };

    var emails = {
        github  : 'https://api.github.com/user/emails?access_token=:access_token',
        twitter : 'https://api.twitter.com/1.1/account/verify_credentials.json'
    };

    var _email    = req.body.email;
    var _username = req.body.username;
    var _headers  = {'User-Agent': 'app.io'};
    var endpoint  = endpoints[network];
    endpoint      = endpoint.replace(/:access_token/g, token);
    
    if(network == 'github') {
        new _r().get(network, endpoint, {}, _headers).exec(function(err, results) {

            if(dot.get(results, network+'.code') == 200) {
                var body     = dot.get(results, network+'.body');
                var email    = body.email;
                var username = body.login;

                // eğer verdiği parametrelerle sosyal ağ bilgileri uyuşmuyorsa kontrol et
                if( _email != email && _username != username ) {
                    // check from user/emails
                    var userMails = emails.github.replace(/:access_token/g, token);
                    new _r().get(network, userMails, {}, _headers).exec(function(err, results) {
                        userMails = dot.get(results, network+'.body');
                        var error = false;

                        if( ! userMails || Object.prototype.toString.call(userMails) != '[object Array]' || ! userMails.length )
                            error = 'not found user/emails';

                        var mails = _.map(userMails, function(obj) {return obj.email});

                        if(mails.indexOf(_email) == -1)
                            error = 'check your email';

                        if(error) {
                            return next( _resp.Unauthorized({
                                middleware: _middle,
                                type: 'InvalidCredentials',
                                errors: [error]}
                            ));
                        }
                        else {
                            req.__social = {email: email, user: username, name: body.name};
                            return next();
                        }
                    });
                }
                // email ve username eşleşiyorsa datayı set et
                else {
                    req.__social = {email: email, user: username, name: body.name};
                    return next();
                }
            }
            // eğer code 200 dönmediyse hata at
            else {
                next( _resp.Unauthorized({
                    middleware: _middle,
                    type: 'InvalidCredentials',
                    errors: ['check social network credentials']}
                ));
            }
        });        
    }
    else if(network == 'twitter') {
        var consumer = dot.get(_app.config, _env+'.social.'+req.__appData.slug+'.twitter.consumer');
        
        if( ! consumer ) {
            next( _resp.Unauthorized({
                middleware: _middle,
                type: 'InvalidCredentials',
                errors: ['twitter consumer config not found']}
            ));
        }

        var oauth = {
            consumer_key: consumer.key,
            consumer_secret: consumer.secret,
            token: token,
            token_secret: secret
        }
        
        request.get({url: endpoint, oauth: oauth, json:true}, function (err, response, user) {
            var id = dot.get(user, 'id');
            
            if( ! id ) {
                next( _resp.Unauthorized({
                    middleware: _middle,
                    type: 'InvalidCredentials',
                    errors: ['check social network credentials']}
                ));
            }

            req.__social = {email: _email, user: _username, name: dot.get(user, 'name')};
            return next();
        });
    }
}

module.exports = function(app) {
    return CheckSocial;
};