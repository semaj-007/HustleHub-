const client = require('@prometheus-io/client');
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: 'hustlehub_' });
const requests = new client.Counter({
  name: 'hustlehub_http_requests_total',
  help: 'Completed HTTP requests',
  labelNames: ['method', 'status_class'],
  registers: [registry],
});
const duration = new client.Histogram({
  name: 'hustlehub_http_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'status_class'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [registry],
});
const events = new client.Counter({
  name: 'hustlehub_security_events_total',
  help: 'Application audit events by fixed server event name',
  labelNames: ['event'],
  registers: [registry],
});
module.exports = { registry, requests, duration, events };
