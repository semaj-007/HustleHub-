const { defineConfig } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { createHash, X509Certificate } = require('node:crypto');
require('./backend/scripts/certs.cjs')();
const certificate = new X509Certificate(
  fs.readFileSync(path.join(__dirname, 'backend/certs/cert.pem')),
);
const spki = createHash('sha256')
  .update(certificate.publicKey.export({ type: 'spki', format: 'der' }))
  .digest('base64');
const executable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
module.exports = defineConfig({
  testDir: './tests',
  testMatch: '*.spec.cjs',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 8000 },
  reporter: 'list',
  use: {
    baseURL: 'https://localhost:9443',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: executable,
      args: [`--ignore-certificate-errors-spki-list=${spki}`],
    },
  },
  webServer: {
    command: 'node tests/serve.cjs',
    url: 'https://localhost:9443/api/health',
    ignoreHTTPSErrors: true,
    reuseExistingServer: false,
    timeout: 30000,
  },
});
