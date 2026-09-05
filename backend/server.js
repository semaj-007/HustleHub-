//HTTPS entry point.

const fs = require('fs');
const https = require('https');
const config = require('./src/config/env');
const logger = require('./src/config/logger');
const createApp = require('./src/app');

function loadTlsCredentials() {
  const { keyPath, certPath } = config.https;

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    logger.error('TLS certificate/key not found', { keyPath, certPath });
    // Intentionally a plain console message (not the JSON logger) so it is
    // unmissable in a terminal when someone runs this for the first time.
    // eslint-disable-next-line no-console
    console.error(
      '\nCould not find a TLS certificate/key.\n' +
        `Expected key at:  ${keyPath}\n` +
        `Expected cert at: ${certPath}\n\n` +
        'Generate a local self-signed certificate with:\n' +
        '  npm run certs\n'
    );
    process.exit(1);
  }

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

function main() {
  const credentials = loadTlsCredentials();
  const app = createApp();

  const server = https.createServer(credentials, app);

  server.listen(config.port, () => {
    logger.info(`HustleHub+ API listening on https://localhost:${config.port}`, {
      env: config.env,
    });
  });

  // Fail loudly on unexpected errors instead of continuing in an unknown state.
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
    process.exit(1);
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { message: err.message, stack: err.stack });
    process.exit(1);
  });
}

main();
