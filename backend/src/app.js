
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const config = require('./config/env');
const logger = require('./config/logger');
const apiRouter = require('./routes');
const notFound = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/errorHandler.middleware');

function createApp() {
  const app = express();

  // Removes the "X-Powered-By: Express" header so the framework/version
  // isn't handed to an attacker for free.
  app.disable('x-powered-by');

  // Sets a solid baseline of security-related HTTP response headers
  // (HSTS, X-Content-Type-Options, X-Frame-Options, CSP, etc.).
  app.use(helmet());

  // Only the configured origin(s) - the future React frontend - may make
  // credentialed cross-origin requests. No wildcard "*" is used because
  // this API issues bearer tokens intended for a specific trusted client.
  app.use(
    cors({
      origin: config.cors.origins,
      credentials: true,
    })
  );

  // Body size is capped to reduce the impact of large-payload DoS attempts.
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));

  // Lightweight structured request logging (method, path, status, duration).
  // Deliberately does NOT log headers or bodies, so tokens/passwords in a
  // request can never end up in a log line via this middleware.
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info('HTTP request', {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Date.now() - start,
      });
    });
    next();
  });

  // Health check endpoint for root directory requests
  app.get('/', (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'HustleHub+ API is active and running',
      environment: config.env,
    });
  });

   app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      
    });
  });

  // Ignore browser favicon requests
  app.get('/favicon.ico', (req, res) => res.status(204).end());

  // Mount API endpoints
  app.use('/api', apiRouter);

  // 404 & Error Handling
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;