const { verifyAccessToken } = require('../utils/jwt');
const userRepository = require('../modules/auth/user.repository');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
  if (!match) throw ApiError.unauthorized();
  let payload;
  try {
    payload = verifyAccessToken(match[1]);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
  if (typeof payload.sub !== 'string') throw ApiError.unauthorized();
  const user = await userRepository.findById(payload.sub);
  if (!user || !['client', 'freelancer', 'admin'].includes(user.role))
    throw ApiError.unauthorized();
  // Current persisted role is authoritative, not stale claims or request input.
  req.user = { sub: user.id, role: user.role, name: user.name };
  res.set('Cache-Control', 'no-store');
  next();
});
function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
}
module.exports = { authenticate, authorize };
