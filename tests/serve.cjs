const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const { randomBytes } = require('node:crypto');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hustlehub-browser-'));
Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_SECRET: randomBytes(64).toString('hex'),
  BCRYPT_SALT_ROUNDS: '4',
  USER_STORE_PATH: path.join(dir, 'users.json'),
  MARKETPLACE_STORE_PATH: path.join(dir, 'marketplace.json'),
  AUTH_RATE_LIMIT_MAX: '100',
  BOOKING_RATE_LIMIT_MAX: '100',
});
require('../backend/scripts/certs.cjs')();
const server = https.createServer(
  {
    key: fs.readFileSync(path.resolve(__dirname, '../backend/certs/key.pem')),
    cert: fs.readFileSync(path.resolve(__dirname, '../backend/certs/cert.pem')),
  },
  require('../backend/src/app')(),
);
server.listen(9443, 'localhost', () =>
  console.log('Isolated browser test server listening on port 9443'),
);
function cleanup() {
  server.close(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    process.exit(0);
  });
}
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
