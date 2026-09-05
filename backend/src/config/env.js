//Centralised environment configuration.

const path = require('path');
require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

const NODE_ENV = optional('NODE_ENV', 'development');

const jwtSecret = required('JWT_SECRET');
if (
  NODE_ENV === 'production' &&
  /replace_this_with_a_long_random_secret_before_running/i.test(jwtSecret)
) {
  throw new Error(
    'JWT_SECRET is still set to the example placeholder. Generate a real secret ' +
      '(e.g. `openssl rand -hex 64`) before running in production.'
  );
}
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET is too short. Use at least 32 characters of random data.');
}

const config = {
  env: NODE_ENV,
  isProduction: NODE_ENV === 'production',
  port: parseInt(optional('PORT', '8443'), 10),

  https: {
    keyPath: path.resolve(process.cwd(), optional('HTTPS_KEY_PATH', './certs/key.pem')),
    certPath: path.resolve(process.cwd(), optional('HTTPS_CERT_PATH', './certs/cert.pem')),
  },

  cors: {
    // Comma separated list -> array. Never falls back to "*" for credentialed requests.
    origins: optional('CORS_ORIGIN', 'https://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },

  jwt: {
    secret: jwtSecret,
    expiresIn: optional('JWT_EXPIRES_IN', '1h'),
    issuer: optional('JWT_ISSUER', 'hustlehub-plus-api'),
  },

  bcrypt: {
    saltRounds: parseInt(optional('BCRYPT_SALT_ROUNDS', '12'), 10),
  },

  authRateLimit: {
    windowMs: parseInt(optional('AUTH_RATE_LIMIT_WINDOW_MS', String(15 * 60 * 1000)), 10),
    max: parseInt(optional('AUTH_RATE_LIMIT_MAX', '10'), 10),
  },

  userStorePath: path.resolve(process.cwd(), optional('USER_STORE_PATH', './src/data/users.json')),
};

module.exports = config;
