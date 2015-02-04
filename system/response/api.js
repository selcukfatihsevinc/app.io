require('extend-error');

function responseHandler(name, code, data, res) {
    code = code || 200;

    var response = {
        meta: {
            name : name,
            code : code || null
        },
        data : data || null
    };

    res.status(code).json(response);
}

// Response to a successful GET, PUT, PATCH or DELETE. Can also be used for a POST that doesn't result in a creation.
exports.OK = function(message, res) {
    responseHandler('OK', 200, message, res);
};

// Response to a POST that results in a creation. Should be combined with a Location header pointing to the location of the new resource
exports.Created = function(message, res) {
    responseHandler('Created', 201, message, res);
};

// Response to a successful request that won't be returning a body (like a DELETE request)
exports.NoContent = function(message, res) {
    responseHandler('NoContent', 204, message, res);
};

// --- The request is malformed, such as if the body does not parse
exports.BadRequest = Error.extend('BadRequest', 400);

// --- When no or invalid authentication details are provided. Also useful to trigger an auth popup if the API is used from a browser
exports.Unauthorized = Error.extend('Unauthorized', 401);

// --- When authentication succeeded but authenticated user doesn't have access to the resource
exports.Forbidden = Error.extend('Forbidden', 403);

// --- When a non-existent resource is requested
exports.NotFound = Error.extend('NotFound', 404);

// --- When an HTTP method is being requested that isn't allowed for the authenticated user
exports.MethodNotAllowed = Error.extend('MethodNotAllowed', 405);

// --- Indicates that the resource at this end point is no longer available. Useful as a blanket response for old API versions
exports.Gone = Error.extend('Gone', 410);

// --- If incorrect content type was provided as part of the request
exports.UnsupportedMediaType = Error.extend('UnsupportedMediaType', 415);

// --- Used for validation errors
exports.UnprocessableEntity = Error.extend('UnprocessableEntity', 422);

// --- When a request is rejected due to rate limiting
exports.TooManyRequests = Error.extend('TooManyRequests', 429);

// --- Internal server error
exports.InternalServerError = Error.extend('InternalServerError', 500);






