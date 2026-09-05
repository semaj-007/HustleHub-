//Password hashing utilities
const bcrypt = require('bcrypt');
const config = require('../config/env');

async function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, config.bcrypt.saltRounds);
}

async function verifyPassword(plainTextPassword, passwordHash) {
  return bcrypt.compare(plainTextPassword, passwordHash);
}

module.exports = { hashPassword, verifyPassword };
