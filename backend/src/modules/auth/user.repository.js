const { randomUUID } = require('node:crypto');
const config = require('../../config/env');
const jsonStore = require('../../utils/jsonStore');
const ApiError = require('../../utils/ApiError');

const store = jsonStore(config.userStorePath, [], Array.isArray);
const findByEmail = async (email) =>
  (await store.read()).find((user) => user.email === email.trim().toLowerCase()) || null;
const findById = async (id) => (await store.read()).find((user) => user.id === id) || null;
function create({ name, email, passwordHash, role }) {
  return store.update((users) => {
    if (users.some((user) => user.email === email))
      throw ApiError.conflict('An account with this email already exists');
    const now = new Date().toISOString();
    const user = {
      id: randomUUID(),
      name,
      email,
      passwordHash,
      tokenVersion: 0,
      role,
      createdAt: now,
      updatedAt: now,
    };
    users.push(user);
    return user;
  });
}
function recordLoginResult(id, matches, now = Date.now()) {
  return store.update((users) => {
    const user = users.find((item) => item.id === id);
    if (!user) return { allowed: false };
    if ((user.lockedUntil || 0) > now) return { allowed: false, locked: true };
    if (matches) {
      user.failedLogins = 0;
      user.failureWindowStart = 0;
      user.lockedUntil = 0;
      return { allowed: true, user };
    }
    if (!user.failureWindowStart || now - user.failureWindowStart >= config.lockout.windowMs) {
      user.failureWindowStart = now;
      user.failedLogins = 0;
    }
    user.failedLogins = (user.failedLogins || 0) + 1;
    if (user.failedLogins >= config.lockout.maxFailures) {
      user.lockedUntil = now + config.lockout.durationMs;
      user.failedLogins = 0;
      user.failureWindowStart = 0;
      // A lockout also invalidates existing sessions.
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      return { allowed: false, locked: true };
    }
    return { allowed: false };
  });
}
function revokeSessions(id) {
  return store.update((users) => {
    const user = users.find((item) => item.id === id);
    if (!user) throw ApiError.unauthorized();
    user.tokenVersion = (user.tokenVersion || 0) + 1;
  });
}
module.exports = { findByEmail, findById, create, recordLoginResult, revokeSessions };
