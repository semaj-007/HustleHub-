const express = require('express');
const controller = require('./auth.controller');
const {
  registerValidators,
  loginValidators,
  handleValidationResult,
} = require('./auth.validation');
const { authenticate } = require('../../middleware/auth.middleware');
const { authLimiter } = require('../../middleware/rateLimiter.middleware');
const { fields } = require('../../middleware/validation.middleware');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  fields(['name', 'email', 'password', 'role']),
  registerValidators,
  handleValidationResult,
  controller.register,
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  fields(['email', 'password']),
  loginValidators,
  handleValidationResult,
  controller.login,
);

// GET /api/auth/me - sample protected route proving JWT middleware works
router.get('/me', authenticate, controller.me);

router.post(
  '/logout',
  authenticate,
  require('../../utils/asyncHandler')(async (req, res) => {
    await require('./user.repository').revokeSessions(req.user.sub);
    require('../../monitoring/audit')('auth.sessions_revoked', {
      userId: req.user.sub,
      requestId: req.id,
    });
    res.status(204).end();
  }),
);
module.exports = router;
