const ApiError = require('../utils/ApiError');

function notFound(req, _res, next) {
  next(ApiError.notFound('Resource not found'));
}

module.exports = notFound;
