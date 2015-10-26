function Mailer(transport) {
    this._transport = transport;
    return this;
}

Mailer.prototype.send = function(opts, cb) {
    if( ! this._transport ) {
        console.log('mailer.send transport not found');

        if(cb)
            return cb(true);
        else
            return false;
    }

    this._transport.sendMail(opts, function(err, info) {
        if(cb) {
            console.log('mailer.send callback found');

            if(err)
                console.log(err);

            return cb(err, info);
        }

        if(err)
            return console.log(err);

        console.log('Message sent: '+info.response);
    });
};

module.exports = function(app) {
    return Mailer;
};


