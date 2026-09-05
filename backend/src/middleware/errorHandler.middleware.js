//Centralised error handler - the LAST middleware mounted in app.js

const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError && err.isOperational) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { stack: err.stack, path: req.originalUrl });
    } else {
      logger.info('Request rejected', {
        statusCode: err.statusCode,
        path: req.originalUrl,
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

  // Unexpected error: log everything internally, reveal nothing externally.
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
  });
  return res.status(500).json({ error: { message: 'Internal server error' } });
}

module.exports = errorHandler;
