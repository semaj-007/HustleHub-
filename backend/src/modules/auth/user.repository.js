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
      role,
      createdAt: now,
      updatedAt: now,
    };
    users.push(user);
    return user;
  });
}
module.exports = { findByEmail, findById, create };
