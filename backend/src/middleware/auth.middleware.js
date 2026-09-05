
// JWT verification
 
const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload; // { sub, role, iat, exp, iss }
    return next();
  } catch (err) {
    logger.warn('JWT verification failed', { reason: err.name });
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
}

function authorize(...allowedRoles) {
  return function (req, _res, next) {
    if (!req.user) {
      // Programming error if this fires - authorize() must run after authenticate()
      return next(ApiError.internal());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden());
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
