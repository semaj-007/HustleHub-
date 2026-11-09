const { body } = require('express-validator');
const { cleanText, isPlainText, validate } = require('../../middleware/validation.middleware');
const email = () =>
  body('email')
    .isString()
    .withMessage('Email must be text')
    .bail()
    .trim()
    .isLength({ max: 254 })
    .isEmail()
    .withMessage('Enter a valid email address')
    .bail()
    .customSanitizer((value) => value.toLowerCase());
const password = () =>
  body('password')
    .isString()
    .withMessage('Password is required')
    .bail()
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('Password must be at most 72 bytes');
const registerValidators = [
  body('name')
    .isString()
    .withMessage('Name is required')
    .bail()
    .customSanitizer(cleanText)
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters')
    .custom(isPlainText)
    .withMessage('Name must be plain text'),
  email(),
  password()
    .isLength({ min: 10 })
    .withMessage('Password must be at least 10 characters')
    .matches(/[a-z]/)
    .withMessage('Password must include a lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must include an uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must include a number'),
  body('role')
    .isString()
    .bail()
    .isIn(['client', 'freelancer'])
    .withMessage('Choose client or freelancer'),
];
const loginValidators = [email(), password().notEmpty().withMessage('Password is required')];
module.exports = { registerValidators, loginValidators, handleValidationResult: validate };
