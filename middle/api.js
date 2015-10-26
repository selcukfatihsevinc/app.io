function Api(req, res, next) {
    res.__api = true;
    next();
}

module.exports = function(app) {
    return Api;
};