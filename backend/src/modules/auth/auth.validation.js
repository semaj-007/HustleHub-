//Input validation & sanitisation for the auth module
const { body, validationResult } = require('express-validator');
const ApiError = require('../../utils/ApiError');

const MAX_NAME_LENGTH = 100;
const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 128; // prevent bcrypt DoS via absurdly long input

const registerValidators = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: MAX_NAME_LENGTH })
    .withMessage(`Name must be at most ${MAX_NAME_LENGTH} characters`)
    .escape(), // neutralise HTML/script special chars before storage

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('A valid email address is required')
    .isLength({ max: 254 })
    .withMessage('Email is too long')
    .normalizeEmail(),

  body('password')
    .isString()
    .isLength({ min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH })
    .withMessage(`Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`)
    .matches(/[a-z]/)
    .withMessage('Password must include a lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must include an uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must include a number'),

  body('role')
    .trim()
    .toLowerCase()
    .isIn(['client', 'freelancer'])
    .withMessage('Role must be either "client" or "freelancer"'),
];

const loginValidators = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),

  // Deliberately no complexity checks on login - we validate the password
  // is *present* and within a sane length only. Applying the "must contain
  // an uppercase letter" style rules here would let an attacker use
  // validation error messages to fingerprint the password policy without
  // ever attempting a real login, and would reject legitimate users whose
  // password predates a policy change.
  body('password')
    .isString()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: MAX_PASSWORD_LENGTH })
    .withMessage('Password is too long'),
];

/**
 * Reads the results collected by the validators above and, if any failed,
 * throws a single 400 ApiError with a safe, field-level breakdown. Must
 * run after the validator chain in the route definition.
 */
function handleValidationResult(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }
  const details = result.array({ onlyFirstError: true }).map((e) => ({
    field: e.path,
    message: e.msg,
  }));
  return next(ApiError.badRequest('Validation failed', details));
}

module.exports = { registerValidators, loginValidators, handleValidationResult };
