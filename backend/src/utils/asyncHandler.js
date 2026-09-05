/**
 * Wraps an async Express route/middleware handler so any rejected promise
 * or thrown error is passed to next(), reaching the centralised error
 * handler instead of crashing the process or hanging the request.
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
