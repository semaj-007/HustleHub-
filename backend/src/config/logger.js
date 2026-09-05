//Application-wide structured logger

const winston = require('winston');
const config = require('./env');

const SENSITIVE_KEYS = new Set([
  'password',
  'confirmpassword',
  'currentpassword',
  'newpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'jwtsecret',
]);

function redact(value) {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value && typeof value === 'object') {
    const clone = {};
    for (const [key, val] of Object.entries(value)) {
      clone[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : redact(val);
    }
    return clone;
  }
  return value;
}

const redactFormat = winston.format((info) => {
  for (const key of Object.keys(info)) {
    if (!['level', 'message', 'timestamp'].includes(key)) {
      info[key] = redact(info[key]);
    }
  }
  return info;
});

const logger = winston.createLogger({
  level: config.isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    redactFormat(),
    config.isProduction
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp, ...meta }) => {
            const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `[${timestamp}] ${level}: ${message}${extra}`;
          })
        )
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;