function Json(req, res, next) {
    res.jsonResponse = true;
    next();
}

module.exports = function(app) {
    return Json;
};