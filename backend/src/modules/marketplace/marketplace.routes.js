const express = require('express');
const service = require('./marketplace.service');
const { gigValidators, browseValidators, bookingValidators } = require('./marketplace.validation');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { bookingLimiter, mutationLimiter } = require('../../middleware/rateLimiter.middleware');
const { idParam } = require('../../middleware/validation.middleware');
const wrap = require('../../utils/asyncHandler');
const router = express.Router();
const freelancer = [authenticate, authorize('freelancer')];
const participants = [authenticate, authorize('client', 'freelancer')];

router.get(
  '/gigs',
  browseValidators,
  wrap(async (req, res) => res.json(await service.browse(req.query))),
);
router.get(
  '/gigs/mine',
  ...freelancer,
  wrap(async (req, res) => res.json({ gigs: await service.ownGigs(req.user) })),
);
router.get(
  '/gigs/mine/:id',
  ...freelancer,
  idParam,
  wrap(async (req, res) => res.json({ gig: await service.getOwnGig(req.params.id, req.user) })),
);
router.get(
  '/gigs/:id',
  idParam,
  wrap(async (req, res) => res.json({ gig: await service.getPublicGig(req.params.id) })),
);
router.post(
  '/gigs',
  ...freelancer,
  mutationLimiter,
  gigValidators(),
  wrap(async (req, res) =>
    res.status(201).json({ gig: await service.createGig(req.body, req.user) }),
  ),
);
router.patch(
  '/gigs/:id',
  ...freelancer,
  mutationLimiter,
  idParam,
  gigValidators(true),
  wrap(async (req, res) =>
    res.json({ gig: await service.updateGig(req.params.id, req.body, req.user) }),
  ),
);
router.delete(
  '/gigs/:id',
  ...freelancer,
  mutationLimiter,
  idParam,
  wrap(async (req, res) => {
    await service.deleteGig(req.params.id, req.user);
    res.status(204).end();
  }),
);
router.post(
  '/bookings',
  authenticate,
  authorize('client'),
  bookingLimiter,
  bookingValidators,
  wrap(async (req, res) => {
    const { replayed, ...result } = await service.book(
      req.body.gigId,
      req.get('Idempotency-Key'),
      req.user,
    );
    res.status(replayed ? 200 : 201).json(result);
  }),
);
router.get(
  '/bookings',
  ...participants,
  wrap(async (req, res) => res.json({ bookings: await service.bookings(req.user) })),
);
router.get(
  '/bookings/:id',
  ...participants,
  idParam,
  wrap(async (req, res) => res.json({ booking: await service.booking(req.params.id, req.user) })),
);
router.get(
  '/transactions',
  ...participants,
  wrap(async (req, res) => res.json({ transactions: await service.transactions(req.user) })),
);
router.get(
  '/transactions/:id',
  ...participants,
  idParam,
  wrap(async (req, res) =>
    res.json({ transaction: await service.transaction(req.params.id, req.user) }),
  ),
);
router.get(
  '/income',
  ...freelancer,
  wrap(async (req, res) => res.json({ income: await service.income(req.user) })),
);
module.exports = router;
