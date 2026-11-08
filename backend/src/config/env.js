//Centralised environment configuration.

const path = require('path');
const fs = require('node:fs');
require('dotenv').config();

function optional(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

const NODE_ENV = optional('NODE_ENV', 'development');

function secret(name, mandatory = false) {
  const filename = process.env[`${name}_FILE`];
  const value = filename ? fs.readFileSync(filename, 'utf8').trim() : process.env[name];
  if ((mandatory || filename) && !value) throw new Error(`Missing required secret: ${name}`);
  if (value && value.length < 32) throw new Error(`${name} must have at least 32 characters`);
  return value || '';
}
const jwtSecret = secret('JWT_SECRET', true);
if (/replace_this_with_a_long_random_secret_before_running/i.test(jwtSecret)) {
  throw new Error(
    'JWT_SECRET is still set to the example placeholder. Generate a real secret ' +
      '(e.g. `openssl rand -hex 64`) before running.',
  );
}
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET is too short. Use at least 32 characters of random data.');
}

const config = {
  env: NODE_ENV,
  isProduction: NODE_ENV === 'production',
  monitoringToken: secret('MONITORING_TOKEN'),
  lockout: { maxFailures: 5, windowMs: 15 * 60 * 1000, durationMs: 15 * 60 * 1000 },
  trustProxy: optional('TRUST_PROXY_HOPS', '0') === '1' ? 1 : false,
  port: parseInt(optional('PORT', '8443'), 10),

  https: {
    keyPath: path.resolve(process.cwd(), optional('HTTPS_KEY_PATH', './certs/key.pem')),
    certPath: path.resolve(process.cwd(), optional('HTTPS_CERT_PATH', './certs/cert.pem')),
  },

  cors: {
    // Comma separated list -> array. Never falls back to "*" for credentialed requests.
    origins: optional('CORS_ORIGIN', 'https://localhost:5173')
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
  marketplaceStorePath: path.resolve(
    process.cwd(),
    optional('MARKETPLACE_STORE_PATH', './src/data/marketplace.json'),
  ),
  frontendPath: path.resolve(__dirname, '../../../frontend/dist'),
  bookingRateLimit: {
    windowMs: parseInt(optional('BOOKING_RATE_LIMIT_WINDOW_MS', '900000'), 10),
    max: parseInt(optional('BOOKING_RATE_LIMIT_MAX', '20'), 10),
  },
};

module.exports = config;
