function Mailer(transport) {
    this._transport = transport;
    return this;
}

Mailer.prototype.send = function(opts, cb) {
    if( ! this._transport ) {
<<<<<<< HEAD
        console.log('mailer.send transport not found');
=======
        console.log('mailer transport not found');
>>>>>>> ce3a548700b5efeab14874abd62ca89cc035d2a9

        if(cb)
            return cb(true);
        else
            return false;
    }

    this._transport.sendMail(opts, function(err, info) {
        if(cb) {
            console.log('mailer.send callback found');
<<<<<<< HEAD

            if(err)
                console.log(err);

=======
>>>>>>> ce3a548700b5efeab14874abd62ca89cc035d2a9
            return cb(err, info);
        }

        if(err)
            return console.log(err);

        console.log('Message sent: ' + info.response);
    });
};

module.exports = function(app) {
    return Mailer;
};


