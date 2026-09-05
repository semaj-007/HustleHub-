/**
 * Auth service - business logic only, no knowledge of Express.
 * Keeping this separate from the controller makes it directly unit
 * testable (see Part 3) without spinning up an HTTP server.
 */
const userRepository = require('./user.repository');
const { hashPassword, verifyPassword } = require('../../utils/password');
const { signAccessToken } = require('../../utils/jwt');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');

/**
 * Strips internal-only fields (passwordHash) before a user object is ever
 * handed to a controller / serialised into an HTTP response.
 */
function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

async function register({ name, email, password, role }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    // Generic-enough message: confirms an account exists for this email,
    // which is an acceptable/expected trade-off for registration flows
    // (unlike login, where we hide this - see login() below).
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const user = await userRepository.create({ name, email, passwordHash, role });

  logger.info('User registered', { userId: user.id, role: user.role });

  const token = signAccessToken(user);
  return { user: toPublicUser(user), token };
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);

  // Intentionally identical error for "no such user" and "wrong password".
  // Distinguishing them lets an attacker enumerate valid accounts.
  const genericError = () => ApiError.unauthorized('Invalid email or password');

  if (!user) {
    logger.warn('Login attempt for unknown email');
    throw genericError();
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    logger.warn('Failed login attempt (bad password)', { userId: user.id });
    throw genericError();
  }

  logger.info('User logged in', { userId: user.id, role: user.role });

  const token = signAccessToken(user);
  return { user: toPublicUser(user), token };
}

async function getById(id) {
  const user = await userRepository.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return toPublicUser(user);
}

module.exports = { register, login, getById, toPublicUser };
