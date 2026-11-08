import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const cert = path.resolve(root, '../backend/certs/cert.pem');
const key = path.resolve(root, '../backend/certs/key.pem');
// Trust the specific local certificate, never disable TLS verification.
const tls =
  fs.existsSync(cert) && fs.existsSync(key)
    ? { cert: fs.readFileSync(cert), key: fs.readFileSync(key) }
    : undefined;
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    https: tls,
    proxy: {
      '/api': {
        target: process.env.API_TARGET || 'https://localhost:8443',
        agent: new https.Agent({ ca: tls?.cert }),
        secure: true,
      },
    },
    headers: { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' },
  },
  test: { environment: 'jsdom', setupFiles: './src/test-setup.js', css: false },
});
