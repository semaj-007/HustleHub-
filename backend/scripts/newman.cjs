const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const { randomBytes } = require('node:crypto');
const { spawn } = require('node:child_process');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hustlehub-newman-'));
Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_SECRET: randomBytes(64).toString('hex'),
  BCRYPT_SALT_ROUNDS: '4',
  USER_STORE_PATH: path.join(directory, 'users.json'),
  MARKETPLACE_STORE_PATH: path.join(directory, 'marketplace.json'),
  AUTH_RATE_LIMIT_MAX: '100',
  BOOKING_RATE_LIMIT_MAX: '100',
});
require('./certs.cjs')(directory);
const cert = path.join(directory, 'cert.pem');
const server = https.createServer(
  { key: fs.readFileSync(path.join(directory, 'key.pem')), cert: fs.readFileSync(cert) },
  require('../src/app')(),
);
server.listen(0, 'localhost', () => {
  const executable = require.resolve('newman/bin/newman.js');
  const child = spawn(
    process.execPath,
    [
      executable,
      'run',
      path.resolve(__dirname, '../../postman/HustleHub.postman_collection.json'),
      '--env-var',
      `baseUrl=https://localhost:${server.address().port}`,
      '--ssl-extra-ca-certs',
      cert,
      '--bail',
    ],
    { stdio: 'inherit' },
  );
  child.on('error', (error) => {
    console.error(error.message);
    cleanup(1);
  });
  child.on('exit', (code) => cleanup(code ?? 1));
});
server.on('error', (error) => {
  console.error(error.message);
  cleanup(1);
});
function cleanup(code) {
  server.close(() => {
    fs.rmSync(directory, { recursive: true, force: true });
    process.exitCode = code;
  });
}
