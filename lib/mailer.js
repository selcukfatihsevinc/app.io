function Mailer(transport) {
    this._transport = transport;
    return this;
}

Mailer.prototype.send = function(opts) {
    if( ! this._transport )
        return false;

    this._transport.sendMail(opts, function(err, info) {
        if(err)
            return console.log(err);

        console.log('Message sent: ' + info.response);
    });
};

module.exports = function(app) {
    return Mailer;
};


