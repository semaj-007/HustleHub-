const logger = require('../config/logger');
const { events } = require('./metrics');
const fields = new Set([
  'userId',
  'clientId',
  'freelancerId',
  'bookingId',
  'transactionId',
  'requestId',
  'role',
  'outcome',
  'statusCode',
]);
function audit(event, metadata = {}) {
  const safe = Object.fromEntries(Object.entries(metadata).filter(([key]) => fields.has(key)));
  logger.info(event, { event, ...safe });
  events.inc({ event });
}
module.exports = audit;
