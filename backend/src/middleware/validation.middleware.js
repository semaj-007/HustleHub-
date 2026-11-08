const { validationResult, param } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Plain text only: trim and remove non-printing controls, then reject HTML.
// React also escapes all text on output. Never interpret user text as HTML/queries.
const cleanText = (value) =>
  value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
const isPlainText = (value) => !/[<>]/.test(value);
function validate(req, _res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const details = errors
    .array({ onlyFirstError: true })
    .map((error) => ({ field: error.path, message: error.msg }));
  next(ApiError.badRequest('Validation failed', details));
}
function fields(allowed) {
  return (req, _res, next) => {
    if (!req.body || Array.isArray(req.body) || typeof req.body !== 'object')
      return next(ApiError.badRequest('A JSON object is required'));
    if (Object.keys(req.body).some((key) => !allowed.includes(key)))
      return next(ApiError.badRequest('Unexpected input fields'));
    next();
  };
}
const idParam = [param('id').isUUID(4).withMessage('A valid resource ID is required'), validate];
module.exports = { cleanText, isPlainText, validate, fields, idParam };
