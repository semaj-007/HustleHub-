//Centralised error handler - the LAST middleware mounted in app.js

const ApiError = require('../utils/ApiError');
const audit = require('../monitoring/audit');
const logger = require('../config/logger');

function errorHandler(err, req, res, _next) {
  if (err.type === 'entity.parse.failed') err = ApiError.badRequest('Invalid JSON body');
  if (err.type === 'entity.too.large') err = new ApiError(413, 'Request body is too large');
  audit(
    err.statusCode >= 500 || !(err instanceof ApiError) ? 'error.internal' : 'request.rejected',
    { requestId: req.id, statusCode: err.statusCode || 500 },
  );
  res.set('Cache-Control', 'no-store');
  if (err instanceof ApiError && err.isOperational) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { stack: err.stack, path: req.path });
    } else {
      logger.info('Request rejected', {
        statusCode: err.statusCode,
        path: req.path,
        requestId: req.id,
        message: err.message,
      });
    }
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // Log a safe error identifier without request values; reveal no internals externally.
  logger.error('Unhandled error', {
    name: err.name,
    path: req.path,
    requestId: req.id,
  });
  return res.status(500).json({ error: { message: 'Internal server error' } });
}

module.exports = errorHandler;
