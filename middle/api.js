function Api(req, res, next) {
    res.apiResponse = true;
    next();
}

module.exports = function(app) {
    return Api;
};