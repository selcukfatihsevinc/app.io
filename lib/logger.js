var async = require('async');
var _     = require('underscore');

function Logger(app) {
    this._app = app;
    this._log = this._app.system.logger;

    this._colors = {
        white: '\u001b[37m',
        grey: '\u001b[90m',
        gray: '\u001b[90m',
        black: '\u001b[30m',
        blue: '\u001b[34m',
        cyan: '\u001b[36m',
        green: '\u001b[32m',
        magenta: '\u001b[35m',
        red: '\u001b[31m',
        yellow: '\u001b[33m',
        reset: '\u001b[0m'
    }

    this._styles = {
        blink: '\u001b[49;5;8m',
        underline: '\u001b[4m',
        bold: '\u001b[1m'
    }

    this._backgrounds = {
        white: '\u001b[47m',
        black: '\u001b[40m',
        blue: '\u001b[44m',
        cyan: '\u001b[46m',
        green: '\u001b[42m',
        magenta: '\u001b[45m',
        red: '\u001b[41m',
        yellow: '\u001b[43m'
    }

    this._seperator =
        this._colors.grey+
        '---------------------------------------------------------------------\n'+
        this._colors.reset;

    return this;
}

Logger.prototype.info = function (group, message) {
    group = this._seperator+this._backgrounds.white+this._colors.green+'[ '+group+' ]'+this._colors.reset;
    this._log.info(group, message);
};

Logger.prototype.error = function (group, error) {
    group = this._seperator+this._backgrounds.white+this._colors.red+'[ '+group+' ]'+this._colors.reset;
    this._log.error(group, error);
};

Logger.prototype.schema = function (group, message, api) {
    var color = api ? this._colors.blue : this._colors.cyan;
    group = this._seperator+this._backgrounds.white+color+'[ '+group+' ]'+this._colors.reset;
    this._log.info(group, message);
};

Logger.prototype.middle = function (group, message) {
    group = this._seperator+this._backgrounds.white+this._colors.magenta+'[ '+group+' ]'+this._colors.reset;
    this._log.info(group, message);
};

Logger.prototype.appio = function (group, message) {
    var logo =
    '\n'+
    '   .--------------------------.\n'+
    '   |                          |\n'+
    '   |          app.io          |\n'+
    '   |                          |\n'+
    '   \'--------------------------\'\n\n';
    process.stdout.write(this._colors.cyan+logo);
    this._log.info(this._seperator+this._backgrounds.black+this._colors.white+'[ '+group+' ]'+this._colors.reset, message);
};

module.exports = function(app) {
    return new Logger(app);
};

