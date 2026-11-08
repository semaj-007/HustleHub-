const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function certificates(dir = path.resolve(__dirname, '../certs')) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const key = path.join(dir, 'key.pem');
  const cert = path.join(dir, 'cert.pem');
  if (fs.existsSync(key) && fs.existsSync(cert)) return;
  if (fs.existsSync(key) || fs.existsSync(cert))
    throw new Error('Incomplete TLS pair; restore or remove the incomplete pair first.');
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-sha256',
      '-nodes',
      '-days',
      '365',
      '-keyout',
      key,
      '-out',
      cert,
      '-subj',
      '/CN=localhost',
      '-addext',
      'subjectAltName=DNS:localhost,IP:127.0.0.1',
    ],
    { stdio: 'pipe' },
  );
  fs.chmodSync(key, 0o600);
  console.log('Created local development TLS certificate.');
}
if (require.main === module) certificates();
module.exports = certificates;
