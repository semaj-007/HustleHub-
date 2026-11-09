const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const options = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests. Please try again later.' } },
};
const authLimiter = rateLimit({
  ...options,
  windowMs: config.authRateLimit.windowMs,
  limit: config.authRateLimit.max,
});
// Mounted after authentication: each account has its own booking allowance.
const bookingLimiter = rateLimit({
  ...options,
  windowMs: config.bookingRateLimit.windowMs,
  limit: config.bookingRateLimit.max,
  keyGenerator: (req) => req.user.sub,
});
const mutationLimiter = rateLimit({
  ...options,
  windowMs: 15 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => req.user.sub,
});
module.exports = { authLimiter, bookingLimiter, mutationLimiter };
