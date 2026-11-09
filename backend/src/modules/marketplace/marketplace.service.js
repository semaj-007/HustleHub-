const { randomUUID } = require('node:crypto');
const config = require('../../config/env');
const jsonStore = require('../../utils/jsonStore');
const audit = require('../../monitoring/audit');
const { financialInsights } = require('../finance/finance.service');
const ApiError = require('../../utils/ApiError');

const store = jsonStore(
  config.marketplaceStorePath,
  { gigs: [], bookings: [], transactions: [] },
  (data) => data && ['gigs', 'bookings', 'transactions'].every((key) => Array.isArray(data[key])),
);
const newest = (items) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const participant = (item, user) => item.clientId === user.sub || item.freelancerId === user.sub;
function ownedGig(data, id, user) {
  const gig = data.gigs.find(
    (item) => item.id === id && !item.deletedAt && item.freelancerId === user.sub,
  );
  if (!gig) throw ApiError.notFound('Gig not found');
  return gig;
}
function publicGig(gig) {
  return {
    id: gig.id,
    title: gig.title,
    description: gig.description,
    category: gig.category,
    priceCents: gig.priceCents,
    currency: gig.currency,
    deliveryDays: gig.deliveryDays,
    freelancerId: gig.freelancerId,
    freelancerName: gig.freelancerName,
    isActive: gig.isActive,
    createdAt: gig.createdAt,
    updatedAt: gig.updatedAt,
  };
}
function publicBooking(booking) {
  // Never expose idempotency keys or unrelated personal information.
  const { idempotencyKey: _idempotencyKey, ...safe } = booking;
  return safe;
}
async function browse({ q = '', category, page = 1, limit = 12 }) {
  let gigs = (await store.read()).gigs.filter((gig) => gig.isActive && !gig.deletedAt);
  if (category) gigs = gigs.filter((gig) => gig.category === category);
  if (q)
    gigs = gigs.filter((gig) =>
      `${gig.title} ${gig.description} ${gig.freelancerName}`
        .toLowerCase()
        .includes(q.toLowerCase()),
    );
  return {
    gigs: newest(gigs)
      .slice((page - 1) * limit, page * limit)
      .map(publicGig),
    pagination: { page, limit, total: gigs.length, pages: Math.ceil(gigs.length / limit) },
  };
}
async function getPublicGig(id) {
  const gig = (await store.read()).gigs.find(
    (item) => item.id === id && item.isActive && !item.deletedAt,
  );
  if (!gig) throw ApiError.notFound('Gig not found');
  return publicGig(gig);
}
async function ownGigs(user) {
  return newest(
    (await store.read()).gigs.filter((gig) => gig.freelancerId === user.sub && !gig.deletedAt),
  ).map(publicGig);
}
async function getOwnGig(id, user) {
  return publicGig(ownedGig(await store.read(), id, user));
}
function createGig(input, user) {
  return store.update((data) => {
    const now = new Date().toISOString();
    const gig = {
      id: randomUUID(),
      freelancerId: user.sub,
      freelancerName: user.name,
      title: input.title,
      description: input.description,
      category: input.category,
      priceCents: input.priceCents,
      currency: 'ZAR',
      deliveryDays: input.deliveryDays,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    data.gigs.push(gig);
    return publicGig(gig);
  });
}
function updateGig(id, input, user) {
  return store.update((data) => {
    const gig = ownedGig(data, id, user);
    for (const key of [
      'title',
      'description',
      'category',
      'priceCents',
      'deliveryDays',
      'isActive',
    ]) {
      if (input[key] !== undefined) gig[key] = input[key];
    }
    gig.updatedAt = new Date().toISOString();
    return publicGig(gig);
  });
}
function deleteGig(id, user) {
  return store.update((data) => {
    const gig = ownedGig(data, id, user);
    gig.deletedAt = new Date().toISOString();
    gig.isActive = false; // Keep historic bookings and income intact.
  });
}
async function book(gigId, idempotencyKey, user, context = {}) {
  const result = await store.update((data) => {
    const existing = data.bookings.find(
      (item) => item.clientId === user.sub && item.idempotencyKey === idempotencyKey,
    );
    if (existing) {
      if (existing.gigId !== gigId)
        throw ApiError.conflict('This confirmation key was already used for another gig');
      return {
        booking: publicBooking(existing),
        transaction: data.transactions.find((item) => item.bookingId === existing.id),
        replayed: true,
      };
    }
    const gig = data.gigs.find((item) => item.id === gigId && item.isActive && !item.deletedAt);
    if (!gig) throw ApiError.notFound('Gig is no longer available');
    if (gig.freelancerId === user.sub) throw ApiError.forbidden('You cannot book your own gig');
    const now = new Date().toISOString();
    const booking = {
      id: randomUUID(),
      gigId: gig.id,
      gigTitle: gig.title,
      clientId: user.sub,
      freelancerId: gig.freelancerId,
      freelancerName: gig.freelancerName,
      amountCents: gig.priceCents,
      currency: 'ZAR',
      deliveryDays: gig.deliveryDays,
      status: 'confirmed',
      paymentMode: 'simulated',
      createdAt: now,
      idempotencyKey,
    };
    const transaction = {
      id: randomUUID(),
      bookingId: booking.id,
      gigId: gig.id,
      gigTitle: gig.title,
      clientId: user.sub,
      freelancerId: gig.freelancerId,
      amountCents: gig.priceCents,
      currency: 'ZAR',
      status: 'simulated',
      createdAt: now,
    };
    // Both records are committed in a single atomic store replacement.
    data.bookings.push(booking);
    data.transactions.push(transaction);
    return { booking: publicBooking(booking), transaction, replayed: false };
  });
  const metadata = {
    bookingId: result.booking.id,
    transactionId: result.transaction.id,
    clientId: user.sub,
    freelancerId: result.booking.freelancerId,
    requestId: context.requestId,
  };
  audit(result.replayed ? 'booking.replayed' : 'booking.confirmed', metadata);
  if (!result.replayed) audit('transaction.created', metadata);
  return result;
}
async function bookings(user) {
  return newest((await store.read()).bookings.filter((item) => participant(item, user))).map(
    publicBooking,
  );
}
async function booking(id, user) {
  const item = (await store.read()).bookings.find(
    (record) => record.id === id && participant(record, user),
  );
  if (!item) throw ApiError.notFound('Booking not found');
  return publicBooking(item);
}
async function transactions(user) {
  return newest((await store.read()).transactions.filter((item) => participant(item, user)));
}
async function transaction(id, user) {
  const item = (await store.read()).transactions.find(
    (record) => record.id === id && participant(record, user),
  );
  if (!item) throw ApiError.notFound('Transaction not found');
  return item;
}
async function income(user) {
  const items = (await store.read()).transactions.filter((item) => item.freelancerId === user.sub);
  return {
    totalCents: items.reduce((total, item) => total + item.amountCents, 0),
    currency: 'ZAR',
    bookingCount: items.length,
    paymentMode: 'simulated',
  };
}
async function insights(user, year) {
  return financialInsights((await store.read()).transactions, user.sub, year);
}
async function ready() {
  await store.read();
  await require('../auth/user.repository').findById('readiness-probe');
  const fs = require('node:fs/promises');
  const path = require('node:path');
  for (const file of [config.userStorePath, config.marketplaceStorePath]) {
    const directory = path.dirname(file);
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    await fs.access(
      directory,
      require('node:fs').constants.R_OK | require('node:fs').constants.W_OK,
    );
  }
}
module.exports = {
  insights,
  ready,
  browse,
  getPublicGig,
  ownGigs,
  getOwnGig,
  createGig,
  updateGig,
  deleteGig,
  book,
  bookings,
  booking,
  transactions,
  transaction,
  income,
};
