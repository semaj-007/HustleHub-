
//JWT helpers.
 
const jwt = require('jsonwebtoken');
const config = require('../config/env');

function signAccessToken(user) {
  const payload = {
    sub: user.id,
    role: user.role,
  };
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: config.jwt.issuer,
  });
}

//Throws (via jsonwebtoken) on invalid signature, expiry, or issuer

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret, {
    issuer: config.jwt.issuer,
  });
}

module.exports = { signAccessToken, verifyAccessToken };
