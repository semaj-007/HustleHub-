const express = require('express');
const authRoutes = require('../modules/auth/auth.routes');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get(
  '/ready',
  require('../utils/asyncHandler')(async (_req, res) => {
    try {
      await require('../modules/marketplace/marketplace.service').ready();
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  }),
);
router.use('/auth', authRoutes);
router.use(require('../modules/marketplace/marketplace.routes'));

module.exports = router;
