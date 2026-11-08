const { body, query, header } = require('express-validator');
const {
  cleanText,
  isPlainText,
  validate,
  fields,
} = require('../../middleware/validation.middleware');
const ApiError = require('../../utils/ApiError');
const categories = ['design', 'development', 'writing', 'marketing', 'business'];
function text(field, min, max, partial) {
  let chain = body(field);
  if (partial) chain = chain.optional();
  return chain
    .isString()
    .withMessage(`${field} must be text`)
    .bail()
    .customSanitizer(cleanText)
    .isLength({ min, max })
    .withMessage(`${field} must be between ${min} and ${max} characters`)
    .custom(isPlainText)
    .withMessage(`${field} must be plain text without HTML`);
}
function gigValidators(partial = false) {
  const optional = (field) => (partial ? body(field).optional() : body(field));
  return [
    fields(['title', 'description', 'category', 'priceCents', 'deliveryDays', 'isActive']),
    (req, _res, next) =>
      Object.keys(req.body).length
        ? next()
        : next(ApiError.badRequest('Supply at least one gig field')),
    text('title', 5, 100, partial),
    text('description', 20, 2000, partial),
    optional('category').isString().bail().isIn(categories).withMessage('Choose a valid category'),
    optional('priceCents')
      .custom((value) => Number.isSafeInteger(value) && value >= 100 && value <= 100000000)
      .withMessage('Price must be an integer from 100 to 100000000 cents'),
    optional('deliveryDays')
      .custom((value) => Number.isInteger(value) && value >= 1 && value <= 90)
      .withMessage('Delivery must be between 1 and 90 days'),
    body('isActive')
      .optional()
      .custom((value) => typeof value === 'boolean')
      .withMessage('Availability must be true or false'),
    validate,
  ];
}
const browseValidators = [
  query('q')
    .optional()
    .isString()
    .bail()
    .customSanitizer(cleanText)
    .isLength({ max: 100 })
    .custom(isPlainText)
    .withMessage('Search must be plain text up to 100 characters'),
  query('category')
    .optional()
    .isString()
    .bail()
    .isIn(categories)
    .withMessage('Choose a valid category'),
  query('page').optional().isInt({ min: 1, max: 100000 }).withMessage('Invalid page').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
    .toInt(),
  validate,
];
const bookingValidators = [
  fields(['gigId']),
  body('gigId').isUUID(4).withMessage('Choose a valid gig'),
  header('Idempotency-Key').isUUID(4).withMessage('A UUID confirmation key is required'),
  validate,
];
module.exports = { categories, gigValidators, browseValidators, bookingValidators };
