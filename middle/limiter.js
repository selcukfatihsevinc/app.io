function Limiter(req, res, next) {

    /**
     * @TODO
     * api rate limiter middleware
     */

    next();

}

module.exports = function(app) {
    return Limiter;
};