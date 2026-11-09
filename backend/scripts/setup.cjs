const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath) && !process.env.JWT_SECRET) {
  fs.writeFileSync(envPath, `JWT_SECRET=${randomBytes(64).toString('hex')}\n`, {
    mode: 0o600,
    flag: 'wx',
  });
  console.log('Created ignored local development .env.');
}
require('./certs.cjs')();
