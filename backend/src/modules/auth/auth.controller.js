const authService = require('./auth.service');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Only these exact fields are ever read from req.body and passed onward,
 * even though validation has already run. This is a deliberate
 * belt-and-braces measure against "mass assignment" style bugs, where a
 * client sends extra fields (e.g. { role: "admin" } or { id: "..." })
 * hoping a later refactor accidentally forwards the whole body somewhere
 * sensitive.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const { user, token } = await authService.register({ name, email, password, role });
  res.status(201).json({ user, token });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await authService.login({ email, password });
  res.status(200).json({ user, token });
});

/**
 * Sample protected route: proves the JWT middleware works end-to-end.
 * req.user is populated by the `authenticate` middleware after verifying
 * the bearer token - it is never trusted from the request body.
 */
const me = asyncHandler(async (req, res) => {
  const user = await authService.getById(req.user.sub);
  res.status(200).json({ user });
});

module.exports = { register, login, me };
