import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import tls from 'node:tls';
import { X509Certificate } from 'node:crypto';
import { parse } from 'dotenv';

export function developmentTls(frontendDirectory, environment = process.env) {
  const backendDirectory = path.resolve(frontendDirectory, '../backend');
  const envFile = path.join(backendDirectory, '.env');
  const backendEnv = fs.existsSync(envFile) ? parse(fs.readFileSync(envFile)) : {};
  // Read only server configuration; never forward backend secrets into Vite's define/env.
  const setting = (name, fallback) => environment[name] || backendEnv[name] || fallback;
  const certFile = path.resolve(backendDirectory, setting('HTTPS_CERT_PATH', './certs/cert.pem'));
  const keyFile = path.resolve(backendDirectory, setting('HTTPS_KEY_PATH', './certs/key.pem'));
  if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
    throw new Error(
      'Development TLS files are missing. Run npm run setup or check HTTPS_CERT_PATH and HTTPS_KEY_PATH in backend/.env.',
    );
  }
  const target = environment.API_TARGET || `https://localhost:${setting('PORT', '8443')}`;
  if (new URL(target).protocol !== 'https:') throw new Error('API_TARGET must use HTTPS.');
  const credentials = { cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) };

  // Supplying `ca` to an Agent REPLACES Node's normal trust store. Retain its
  // default/extra roots and system roots before adding local development trust.
  const ca =
    typeof tls.getCACertificates === 'function'
      ? [...tls.getCACertificates('default'), ...tls.getCACertificates('system')]
      : [...tls.rootCertificates];
  if (environment.NODE_EXTRA_CA_CERTS) ca.push(fs.readFileSync(environment.NODE_EXTRA_CA_CERTS));
  const certificate = new X509Certificate(credentials.cert);
  if (certificate.checkIssued(certificate) && certificate.verify(certificate.publicKey)) {
    ca.push(credentials.cert); // The generated, explicitly configured self-signed localhost cert.
  }
  if (environment.API_CA_PATH) {
    ca.push(fs.readFileSync(path.resolve(frontendDirectory, environment.API_CA_PATH)));
  }
  return { https: credentials, target, agent: new https.Agent({ ca, rejectUnauthorized: true }) };
}
