/**
 * Auth service - business logic only, no knowledge of Express.
 * Keeping this separate from the controller makes it directly unit
 * testable (see Part 3) without spinning up an HTTP server.
 */
const userRepository = require('./user.repository');
const { hashPassword, verifyPassword } = require('../../utils/password');
const { signAccessToken } = require('../../utils/jwt');
const ApiError = require('../../utils/ApiError');
const audit = require('../../monitoring/audit');
const { randomBytes } = require('node:crypto');
let dummyHash;
const getDummyHash = () => (dummyHash ||= hashPassword(randomBytes(32).toString('hex')));

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

async function register({ name, email, password, role }, context = {}) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    // Generic-enough message: confirms an account exists for this email,
    // which is an acceptable/expected trade-off for registration flows
    // (unlike login, where we hide this - see login() below).
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const user = await userRepository.create({ name, email, passwordHash, role });

  audit('auth.registered', { userId: user.id, role: user.role, requestId: context.requestId });

  const token = signAccessToken(user);
  return { user: toPublicUser(user), token };
}

async function login({ email, password }, context = {}) {
  const user = await userRepository.findByEmail(email);
  const matches = await verifyPassword(password, user?.passwordHash || (await getDummyHash()));
  const result = user
    ? await userRepository.recordLoginResult(user.id, matches)
    : { allowed: false };
  if (!result.allowed) {
    audit(result.locked ? 'auth.locked' : 'auth.login_failed', {
      userId: user?.id,
      requestId: context.requestId,
      outcome: 'denied',
    });
    throw ApiError.unauthorized('Invalid email or password');
  }
  audit('auth.login_succeeded', {
    userId: user.id,
    requestId: context.requestId,
    outcome: 'allowed',
  });
  return { user: toPublicUser(result.user), token: signAccessToken(result.user) };
}

async function getById(id) {
  const user = await userRepository.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return toPublicUser(user);
}

module.exports = { register, login, getById, toPublicUser };
