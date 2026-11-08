const { randomUUID } = require('node:crypto');
const logger = require('../config/logger');
const { requests, duration } = require('../monitoring/metrics');
module.exports = (req, res, next) => {
  req.id = randomUUID(); // Do not let a caller spoof correlation identifiers.
  res.set('X-Request-ID', req.id);
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    const labels = {
      method: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(req.method)
        ? req.method
        : 'OTHER',
      status_class: `${Math.floor(res.statusCode / 100)}xx`,
    };
    requests.inc(labels);
    duration.observe(labels, seconds);
    logger.info('http.request', {
      event: 'http.request',
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(seconds * 1000),
    });
  });
  next();
};
