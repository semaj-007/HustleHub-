const express = require('express');
const authRoutes = require('../modules/auth/auth.routes');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.use('/auth', authRoutes);

module.exports = router;
