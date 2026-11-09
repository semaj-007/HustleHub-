const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, '.secrets');
// Compose file-backed secrets must be readable by the non-root container UID.
// The enclosing host directory remains 0700; the API reads secrets from files,
// so these credentials never appear in image layers or container env listings.
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
for (const name of ['jwt-secret', 'monitoring-token']) {
  const filename = path.join(directory, name);
  if (!fs.existsSync(filename))
    fs.writeFileSync(filename, randomBytes(64).toString('hex'), { mode: 0o444, flag: 'wx' });
}
require('../backend/scripts/certs.cjs')();
for (const [source, target] of [
  ['key.pem', 'tls-key'],
  ['cert.pem', 'tls-cert'],
]) {
  const destination = path.join(directory, target);
  if (fs.existsSync(destination)) fs.chmodSync(destination, 0o600);
  fs.copyFileSync(path.join(root, 'backend/certs', source), destination);
  fs.chmodSync(destination, 0o444);
}
console.log('Local container secrets are present; existing files were preserved.');
