const express = require('express');
const { createHash, timingSafeEqual } = require('node:crypto');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const wrap = require('../utils/asyncHandler');
const { registry } = require('./metrics');
const router = express.Router();
const digest = (value) => createHash('sha256').update(value).digest();
router.get(
  '/metrics',
  wrap(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!config.monitoringToken) throw new ApiError(503, 'Monitoring is not configured');
    const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
    if (!match || !timingSafeEqual(digest(match[1]), digest(config.monitoringToken)))
      throw ApiError.unauthorized();
    res.type(registry.contentType).send(await registry.metrics());
  }),
);
module.exports = router;
