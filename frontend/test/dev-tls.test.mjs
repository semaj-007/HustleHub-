import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';
import { execFileSync } from 'node:child_process';
import { developmentTls } from '../dev-tls.js';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hustlehub-tls-'));
const frontend = path.join(directory, 'frontend');
const backend = path.join(directory, 'backend');
const certificates = path.join(backend, 'certs');
const privateCa = path.join(directory, 'ca.pem');
const signedCert = path.join(directory, 'signed.pem');
const signedKey = path.join(directory, 'signed-key.pem');
function openssl(...args) {
  execFileSync('openssl', args, { cwd: directory, stdio: 'pipe' });
}
function get(url, agent) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { agent }, (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => resolve({ status: response.statusCode, body }));
      })
      .on('error', reject);
  });
}
async function serve(credentials, operation) {
  const server = https.createServer(credentials, (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end('{"gigs":[]}');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await operation(server.address().port);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
before(() => {
  fs.mkdirSync(frontend);
  fs.mkdirSync(certificates, { recursive: true });
  openssl(
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '2',
    '-sha256',
    '-keyout',
    path.join(certificates, 'key.pem'),
    '-out',
    path.join(certificates, 'cert.pem'),
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
  );
  openssl(
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '2',
    '-sha256',
    '-keyout',
    'ca-key.pem',
    '-out',
    'ca.pem',
    '-subj',
    '/CN=Test Private Root',
    '-addext',
    'basicConstraints=critical,CA:TRUE',
  );
  openssl(
    'req',
    '-new',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    'signed-key.pem',
    '-out',
    'signed.csr',
    '-subj',
    '/CN=localhost',
  );
  fs.writeFileSync(
    path.join(directory, 'extensions'),
    'subjectAltName=DNS:localhost\nbasicConstraints=CA:FALSE\n',
  );
  openssl(
    'x509',
    '-req',
    '-in',
    'signed.csr',
    '-CA',
    'ca.pem',
    '-CAkey',
    'ca-key.pem',
    '-CAcreateserial',
    '-out',
    'signed.pem',
    '-days',
    '2',
    '-sha256',
    '-extfile',
    'extensions',
  );
});
after(() => fs.rmSync(directory, { recursive: true, force: true }));

test('generated self-signed development certificate is trusted with verification enabled', async () => {
  const settings = developmentTls(frontend, {});
  try {
    await serve(settings.https, async (port) => {
      assert.equal(settings.agent.options.rejectUnauthorized, true);
      assert.deepEqual(await get(`https://localhost:${port}/api/gigs`, settings.agent), {
        status: 200,
        body: '{"gigs":[]}',
      });
    });
  } finally {
    settings.agent.destroy();
  }
});

test('custom backend TLS paths and port plus a private CA work through a real Vite proxy', async () => {
  const { createServer } = await import('vite');
  await serve(
    { key: fs.readFileSync(signedKey), cert: fs.readFileSync(signedCert) },
    async (port) => {
      fs.writeFileSync(
        path.join(backend, '.env'),
        `PORT=${port}\nHTTPS_CERT_PATH=../signed.pem\nHTTPS_KEY_PATH=../signed-key.pem\nJWT_SECRET=never-forward-this-to-the-browser\n`,
      );
      const settings = developmentTls(frontend, { API_CA_PATH: '../ca.pem' });
      assert.equal(settings.target, `https://localhost:${port}`);
      assert.equal(Object.hasOwn(settings, 'JWT_SECRET'), false);
      const vite = await createServer({
        configFile: false,
        root: frontend,
        logLevel: 'silent',
        server: {
          host: '127.0.0.1',
          port: 0,
          proxy: { '/api': { target: settings.target, agent: settings.agent, secure: true } },
        },
      });
      try {
        await vite.listen();
        const { get: httpGet } = await import('node:http');
        const proxyPort = vite.httpServer.address().port;
        const result = await new Promise((resolve, reject) => {
          httpGet(`http://127.0.0.1:${proxyPort}/api/gigs?page=1&limit=9`, (res) => {
            let body = '';
            res.on('data', (chunk) => {
              body += chunk;
            });
            res.on('end', () => resolve({ status: res.statusCode, body }));
          }).on('error', reject);
        });
        assert.deepEqual(result, { status: 200, body: '{"gigs":[]}' });
      } finally {
        await vite.close();
        settings.agent.destroy();
      }
    },
  );
});

test('an unknown signing CA is rejected, and NODE_EXTRA_CA_CERTS is retained', async () => {
  await serve(
    { key: fs.readFileSync(signedKey), cert: fs.readFileSync(signedCert) },
    async (port) => {
      const settings = developmentTls(frontend, { API_TARGET: `https://localhost:${port}` });
      try {
        await assert.rejects(get(settings.target, settings.agent), (error) =>
          ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'].includes(
            error.code,
          ),
        );
      } finally {
        settings.agent.destroy();
      }
      const trusted = developmentTls(frontend, {
        API_TARGET: `https://localhost:${port}`,
        NODE_EXTRA_CA_CERTS: privateCa,
      });
      try {
        assert.equal((await get(trusted.target, trusted.agent)).status, 200);
      } finally {
        trusted.agent.destroy();
      }
    },
  );
});

test('a trusted certificate still has its hostname checked', async () => {
  await serve(
    { key: fs.readFileSync(signedKey), cert: fs.readFileSync(signedCert) },
    async (port) => {
      const settings = developmentTls(frontend, {
        API_TARGET: `https://127.0.0.1:${port}`,
        API_CA_PATH: privateCa,
      });
      try {
        await assert.rejects(get(settings.target, settings.agent), {
          code: 'ERR_TLS_CERT_ALTNAME_INVALID',
        });
      } finally {
        settings.agent.destroy();
      }
    },
  );
});

test('exported TLS settings take precedence and incomplete TLS configuration fails clearly', () => {
  const settings = developmentTls(frontend, {
    HTTPS_CERT_PATH: './certs/cert.pem',
    HTTPS_KEY_PATH: './certs/key.pem',
    PORT: '9555',
  });
  assert.equal(settings.target, 'https://localhost:9555');
  settings.agent.destroy();
  assert.throws(
    () => developmentTls(frontend, { HTTPS_KEY_PATH: './missing.pem' }),
    /Development TLS files are missing/,
  );
  assert.throws(
    () => developmentTls(frontend, { API_TARGET: 'http://localhost:8443' }),
    /must use HTTPS/,
  );
});
