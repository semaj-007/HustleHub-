import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { developmentTls } from './dev-tls.js';
const root = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig(({ command }) => {
  // Production builds do not need development certificates or an API connection.
  const tls = command === 'serve' ? developmentTls(root) : null;
  return {
    plugins: [react()],
    server: tls
      ? {
          port: 5173,
          strictPort: true,
          https: tls.https,
          proxy: {
            '/api': {
              target: tls.target,
              agent: tls.agent,
              secure: true,
            },
          },
          headers: { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' },
        }
      : undefined,
    test: {
      include: ['src/**/*.test.{js,jsx}'],
      environment: 'jsdom',
      setupFiles: './src/test-setup.js',
      css: false,
    },
  };
});
