const express = require('express');
const controller = require('./auth.controller');
const { registerValidators, loginValidators, handleValidationResult } = require('./auth.validation');
const { authenticate } = require('../../middleware/auth.middleware');
const { authLimiter } = require('../../middleware/rateLimiter.middleware');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  registerValidators,
  handleValidationResult,
  controller.register
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  loginValidators,
  handleValidationResult,
  controller.login
);

// GET /api/auth/me - sample protected route proving JWT middleware works
router.get('/me', authenticate, controller.me);

module.exports = router;
