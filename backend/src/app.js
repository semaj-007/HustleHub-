const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config/env');
const observations = require('./middleware/observability.middleware');
const apiRouter = require('./routes');
const notFound = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/errorHandler.middleware');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.set('query parser', 'simple');
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          baseUri: ["'none'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          objectSrc: ["'none'"],
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use(
    cors({
      origin: config.cors.origins,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    }),
  );
  app.use(observations);
  app.use(express.json({ limit: '10kb' }));
  app.use(require('./monitoring/routes'));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use(
    '/api',
    (_req, res, next) => {
      res.set('Cache-Control', 'no-store');
      next();
    },
    apiRouter,
    notFound,
  );
  // A production build is served from the same HTTPS origin as the API.
  if (fs.existsSync(path.join(config.frontendPath, 'index.html'))) {
    app.use(express.static(config.frontendPath, { index: false, dotfiles: 'deny' }));
    app.get('*', (req, res, next) => {
      if (!req.accepts('html')) return next();
      res.set('Cache-Control', 'no-cache').sendFile(path.join(config.frontendPath, 'index.html'));
    });
  } else
    app.get('/', (_req, res) =>
      res.json({ status: 'ok', message: 'HustleHub API; build the frontend or start Vite.' }),
    );
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
module.exports = createApp;
