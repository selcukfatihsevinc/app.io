function Json(req, res, next) {
    res.__json = true;
    next();
}

module.exports = function(app) {
    return Json;
};