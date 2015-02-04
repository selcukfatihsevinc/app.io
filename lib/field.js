function Field(app, field, object, cb) {
    this.render(app, field, object, cb);
}

/**
 * @TODO
 * config'e bağla
 */

Field.prototype.render = function (app, field, object, cb) {
    app.render('admin/form/field/'+field, object, function(err, html) {
        cb(err, html);
    });
};

module.exports = function(app) {
    return Field;
};