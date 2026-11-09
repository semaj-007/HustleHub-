const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hustlehub-test-'));
Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_SECRET: randomBytes(64).toString('hex'),
  BCRYPT_SALT_ROUNDS: '4',
  USER_STORE_PATH: path.join(dir, 'users.json'),
  MARKETPLACE_STORE_PATH: path.join(dir, 'marketplace.json'),
  AUTH_RATE_LIMIT_MAX: '100',
  BOOKING_RATE_LIMIT_MAX: '100',
});
const app = require('../src/app')();
const { signAccessToken } = require('../src/utils/jwt');
const secret = process.env.JWT_SECRET;
const config = require('../src/config/env');
let owner, stranger, client, otherClient, gig, confirmation;
const input = {
  title: 'Thoughtful brand identity design',
  description: 'A complete visual identity for your new independent business.',
  category: 'design',
  priceCents: 250050,
  deliveryDays: 5,
};
const auth = (operation, account) => operation.set('Authorization', `Bearer ${account.token}`);
async function register(role, suffix) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: `Test ${suffix}`,
      email: `${suffix}@example.com`,
      password: 'StrongPassword123',
      role,
    });
  assert.equal(res.status, 201);
  return res.body;
}
before(async () => {
  owner = await register('freelancer', 'owner');
  stranger = await register('freelancer', 'stranger');
  client = await register('client', 'client');
  otherClient = await register('client', 'other');
  const res = await auth(request(app).post('/api/gigs'), owner).send(input);
  assert.equal(res.status, 201);
  gig = res.body.gig;
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('health and security headers include a restrictive CSP', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.match(res.headers['content-security-policy'], /script-src 'self'/);
  assert.match(res.headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.doesNotMatch(res.headers['content-security-policy'], /unsafe-inline|unsafe-eval/);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.ok(res.headers['strict-transport-security']);
  assert.equal(res.headers['x-powered-by'], undefined);
  assert.equal(res.headers['cache-control'], 'no-store');
});
test('authentication returns public user fields and never exposes password hashes', async () => {
  assert.equal(owner.user.passwordHash, undefined);
  const res = await auth(request(app).get('/api/auth/me'), owner);
  assert.equal(res.status, 200);
  assert.equal(res.body.user.id, owner.user.id);
  assert.equal(res.body.user.passwordHash, undefined);
  const wrong = await request(app)
    .post('/api/auth/login')
    .send({ email: 'owner@example.com', password: 'WrongPassword123' });
  const unknown = await request(app)
    .post('/api/auth/login')
    .send({ email: 'missing@example.com', password: 'WrongPassword123' });
  assert.equal(wrong.status, 401);
  assert.deepEqual(wrong.body, unknown.body);
  const good = await request(app)
    .post('/api/auth/login')
    .send({ email: 'OWNER@example.com', password: 'StrongPassword123' });
  assert.equal(good.status, 200);
  assert.ok(good.body.token);
});
test('registration rejects admin, HTML, object payloads, unknown fields, and bcrypt truncation', async () => {
  const base = {
    name: 'Test User',
    email: 'bad@example.com',
    password: 'StrongPassword123',
    role: 'client',
  };
  for (const extra of [
    { role: 'admin' },
    { name: '<script>alert(1)</script>' },
    { email: { $ne: null } },
    { id: randomUUID() },
    { password: 'A1a' + 'é'.repeat(36) },
  ]) {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...base, ...extra });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.stack, undefined);
    assert.equal(res.body.error.details?.[0]?.value, undefined);
  }
});
test('concurrent duplicate registrations create exactly one account', async () => {
  const data = {
    name: 'Race Test',
    email: 'race@example.com',
    password: 'StrongPassword123',
    role: 'client',
  };
  const results = await Promise.all([
    request(app).post('/api/auth/register').send(data),
    request(app).post('/api/auth/register').send(data),
  ]);
  assert.deepEqual(results.map((res) => res.status).sort(), [201, 409]);
});
test('all protected marketplace routes reject missing and invalid JWTs', async () => {
  const routes = [
    ['get', '/gigs/mine'],
    ['get', `/gigs/mine/${gig.id}`],
    ['post', '/gigs'],
    ['patch', `/gigs/${gig.id}`],
    ['delete', `/gigs/${gig.id}`],
    ['post', '/bookings'],
    ['get', '/bookings'],
    ['get', `/bookings/${randomUUID()}`],
    ['get', '/transactions'],
    ['get', `/transactions/${randomUUID()}`],
    ['get', '/income'],
  ];
  for (const [method, route] of routes) {
    assert.equal((await request(app)[method](`/api${route}`)).status, 401, `${method} ${route}`);
    assert.equal(
      (await request(app)[method](`/api${route}`).set('Authorization', 'Bearer forged')).status,
      401,
    );
  }
});
test('expired, wrong-algorithm, nonexistent-user and malformed bearer tokens are rejected', async () => {
  const payload = { sub: owner.user.id, role: 'freelancer' };
  const expired = jwt.sign(payload, secret, { issuer: config.jwt.issuer, expiresIn: -1 });
  const wrongAlgorithm = jwt.sign(payload, secret, {
    issuer: config.jwt.issuer,
    algorithm: 'HS384',
  });
  const missing = signAccessToken({ id: randomUUID(), role: 'freelancer' });
  for (const token of [expired, wrongAlgorithm, missing, `${owner.token} extra`])
    assert.equal(
      (await request(app).get('/api/gigs/mine').set('Authorization', `Bearer ${token}`)).status,
      401,
    );
});
test('persisted role overrides a forged or stale role claim', async () => {
  const token = signAccessToken({ id: client.user.id, role: 'freelancer' });
  assert.equal(
    (await request(app).post('/api/gigs').set('Authorization', `Bearer ${token}`).send(input))
      .status,
    403,
  );
});
test('clients cannot create, edit, delete, or privately manage gigs or view income', async () => {
  for (const [method, route] of [
    ['post', '/gigs'],
    ['patch', `/gigs/${gig.id}`],
    ['delete', `/gigs/${gig.id}`],
    ['get', '/gigs/mine'],
    ['get', '/income'],
  ]) {
    assert.equal(
      (await auth(request(app)[method](`/api${route}`), client).send(input)).status,
      403,
    );
  }
});
test('public browsing exposes available gigs but no private account information', async () => {
  const res = await request(app).get('/api/gigs?category=design&q=brand');
  assert.equal(res.status, 200);
  assert.equal(res.body.pagination.total, 1);
  assert.equal(res.body.gigs[0].id, gig.id);
  assert.equal(res.body.gigs[0].email, undefined);
  assert.equal(res.body.gigs[0].passwordHash, undefined);
  assert.equal((await request(app).get(`/api/gigs/${gig.id}`)).status, 200);
  assert.equal((await request(app).get('/api/gigs?limit=99999')).status, 400);
  assert.equal((await request(app).get('/api/gigs?q[$ne]=x')).status, 200); // Literal unused query key; never interpreted as a query operator.
});
test('owners can view their gig; other freelancers cannot privately read, update, or delete it', async () => {
  assert.equal((await auth(request(app).get(`/api/gigs/mine/${gig.id}`), owner)).status, 200);
  for (const method of ['get', 'patch', 'delete']) {
    const route = method === 'get' ? `/api/gigs/mine/${gig.id}` : `/api/gigs/${gig.id}`;
    const res = await auth(request(app)[method](route), stranger).send(
      method === 'patch' ? { priceCents: 100 } : undefined,
    );
    assert.equal(res.status, 404);
  }
  const mine = await auth(request(app).get('/api/gigs/mine'), stranger);
  assert.deepEqual(mine.body.gigs, []);
});
test('gig input rejects HTML, injection objects, floats, negative prices, and ownership assignment', async () => {
  for (const extra of [
    { title: '<img src=x onerror=alert(1)>' },
    { priceCents: -1 },
    { priceCents: 10.5 },
    { category: { $ne: null } },
    { freelancerId: stranger.user.id },
    { isActive: 'false' },
    { deliveryDays: 0 },
  ]) {
    const res = await auth(request(app).post('/api/gigs'), owner).send({ ...input, ...extra });
    assert.equal(res.status, 400);
  }
  assert.equal((await auth(request(app).patch(`/api/gigs/${gig.id}`), owner).send({})).status, 400);
  assert.equal((await request(app).get('/api/gigs/not-a-uuid')).status, 400);
});
test('paused gigs are private to their owner and unavailable to book', async () => {
  const created = await auth(request(app).post('/api/gigs'), owner).send({
    ...input,
    isActive: false,
  });
  const id = created.body.gig.id;
  assert.equal((await request(app).get(`/api/gigs/${id}`)).status, 404);
  assert.equal((await auth(request(app).get(`/api/gigs/mine/${id}`), stranger)).status, 404);
  assert.equal((await auth(request(app).get(`/api/gigs/mine/${id}`), owner)).status, 200);
  assert.equal(
    (
      await auth(request(app).post('/api/bookings'), client)
        .set('Idempotency-Key', randomUUID())
        .send({ gigId: id })
    ).status,
    404,
  );
});
test('freelancers cannot book; clients cannot inject price, income, or participant IDs', async () => {
  assert.equal(
    (
      await auth(request(app).post('/api/bookings'), owner)
        .set('Idempotency-Key', randomUUID())
        .send({ gigId: gig.id })
    ).status,
    403,
  );
  for (const extra of [
    { amountCents: 1 },
    { clientId: otherClient.user.id },
    { freelancerId: stranger.user.id },
    { status: 'confirmed' },
  ]) {
    assert.equal(
      (
        await auth(request(app).post('/api/bookings'), client)
          .set('Idempotency-Key', randomUUID())
          .send({ gigId: gig.id, ...extra })
      ).status,
      400,
    );
  }
  assert.equal(
    (await auth(request(app).post('/api/bookings'), client).send({ gigId: gig.id })).status,
    400,
  );
});
test('concurrent confirmation retries produce one booking, transaction, and income entry', async () => {
  const key = randomUUID();
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      auth(request(app).post('/api/bookings'), client)
        .set('Idempotency-Key', key)
        .send({ gigId: gig.id }),
    ),
  );
  assert.equal(results.filter((res) => res.status === 201).length, 1);
  assert.equal(results.filter((res) => res.status === 200).length, 4);
  assert.equal(new Set(results.map((res) => res.body.booking.id)).size, 1);
  confirmation = results[0].body;
  assert.equal(confirmation.booking.idempotencyKey, undefined);
  assert.equal(confirmation.transaction.bookingId, confirmation.booking.id);
  assert.equal(confirmation.transaction.amountCents, input.priceCents);
  assert.equal(confirmation.booking.clientId, client.user.id);
  assert.equal(confirmation.transaction.freelancerId, owner.user.id);
  const income = await auth(request(app).get('/api/income'), owner);
  assert.equal(income.body.income.totalCents, input.priceCents);
  assert.equal(income.body.income.bookingCount, 1);
});
test('bookings and transactions are visible only to their participants', async () => {
  for (const [name, resource] of [
    ['bookings', confirmation.booking],
    ['transactions', confirmation.transaction],
  ]) {
    for (const account of [owner, client]) {
      assert.equal(
        (await auth(request(app).get(`/api/${name}/${resource.id}`), account)).status,
        200,
      );
      assert.equal((await auth(request(app).get(`/api/${name}`), account)).body[name].length, 1);
    }
    for (const account of [stranger, otherClient]) {
      assert.equal(
        (await auth(request(app).get(`/api/${name}/${resource.id}`), account)).status,
        404,
      );
      assert.deepEqual((await auth(request(app).get(`/api/${name}`), account)).body[name], []);
    }
  }
  assert.equal((await auth(request(app).get('/api/income'), stranger)).body.income.totalCents, 0);
  // User-supplied filters cannot broaden the server-enforced participant scope.
  assert.deepEqual(
    (await auth(request(app).get(`/api/transactions?freelancerId=${owner.user.id}`), stranger)).body
      .transactions,
    [],
  );
});
test('updates and deletion retain historical booking prices and income', async () => {
  assert.equal(
    (
      await auth(request(app).patch(`/api/gigs/${gig.id}`), owner).send({
        priceCents: 999900,
        title: 'Updated brand design service',
      })
    ).status,
    200,
  );
  const old = await auth(request(app).get(`/api/bookings/${confirmation.booking.id}`), client);
  assert.equal(old.body.booking.amountCents, input.priceCents);
  assert.equal((await auth(request(app).delete(`/api/gigs/${gig.id}`), owner)).status, 204);
  assert.equal((await request(app).get(`/api/gigs/${gig.id}`)).status, 404);
  assert.equal(
    (
      await auth(request(app).post('/api/bookings'), client)
        .set('Idempotency-Key', randomUUID())
        .send({ gigId: gig.id })
    ).status,
    404,
  );
  assert.equal(
    (await auth(request(app).get('/api/income'), owner)).body.income.totalCents,
    input.priceCents,
  );
  assert.equal(
    (await auth(request(app).get(`/api/transactions/${confirmation.transaction.id}`), owner))
      .status,
    200,
  );
});
test('malformed JSON and oversized bodies return controlled errors without internals', async () => {
  const invalid = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{bad');
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.message, 'Invalid JSON body');
  const large = await request(app)
    .post('/api/auth/login')
    .send({ email: 'x'.repeat(11000) });
  assert.equal(large.status, 413);
  assert.equal(
    (await request(app).get('/api/missing?token=private')).body.error.message,
    'Resource not found',
  );
});

test('income and idempotency keys stay scoped when different clients and freelancers book', async () => {
  const listing = await auth(request(app).post('/api/gigs'), stranger).send({
    ...input,
    priceCents: 12345,
  });
  assert.equal(listing.status, 201);
  const key = randomUUID();
  const confirm = (account, gigId) =>
    auth(request(app).post('/api/bookings'), account).set('Idempotency-Key', key).send({ gigId });
  const first = await confirm(client, listing.body.gig.id);
  const second = await confirm(otherClient, listing.body.gig.id);
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.notEqual(first.body.booking.id, second.body.booking.id);
  const conflicting = await confirm(client, randomUUID());
  assert.equal(conflicting.status, 409);
  const otherIncome = await auth(request(app).get('/api/income'), stranger);
  assert.equal(otherIncome.body.income.totalCents, 24690);
  assert.equal(otherIncome.body.income.bookingCount, 2);
  assert.equal(
    (await auth(request(app).get('/api/income'), owner)).body.income.totalCents,
    input.priceCents,
  );
  assert.equal(
    (await auth(request(app).get(`/api/bookings/${second.body.booking.id}`), client)).status,
    404,
  );
});

test('unreadable marketplace data fails closed and never leaks internal errors', async () => {
  const file = process.env.MARKETPLACE_STORE_PATH;
  const original = fs.readFileSync(file);
  try {
    fs.writeFileSync(file, '{corrupted-sensitive-value');
    const res = await request(app).get('/api/gigs');
    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { error: { message: 'Internal server error' } });
    assert.equal(fs.readFileSync(file, 'utf8'), '{corrupted-sensitive-value');
  } finally {
    fs.writeFileSync(file, original);
  }
  assert.equal((await request(app).get('/api/gigs')).status, 200);
});
