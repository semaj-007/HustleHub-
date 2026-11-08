const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomBytes, randomUUID } = require('node:crypto');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hustlehub-rate-'));
Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_SECRET: randomBytes(64).toString('hex'),
  USER_STORE_PATH: path.join(dir, 'users.json'),
  MARKETPLACE_STORE_PATH: path.join(dir, 'marketplace.json'),
  AUTH_RATE_LIMIT_MAX: '2',
  BOOKING_RATE_LIMIT_MAX: '2',
});
const request = require('supertest');
const app = require('../src/app')();
const repo = require('../src/modules/auth/user.repository');
const { signAccessToken } = require('../src/utils/jwt');
after(() => fs.rmSync(dir, { recursive: true, force: true }));
test('authentication is IP rate limited with JSON error and retry headers', async () => {
  for (let index = 0; index < 2; index++)
    assert.equal((await request(app).post('/api/auth/login').send({})).status, 400);
  const res = await request(app).post('/api/auth/register').send({});
  assert.equal(res.status, 429);
  assert.ok(res.headers['retry-after']);
  assert.equal(res.headers['x-ratelimit-limit'], undefined);
  assert.match(res.body.error.message, /Too many requests/);
});
test('booking rate limits are enforced per authenticated account', async () => {
  const one = await repo.create({
    name: 'One',
    email: 'one@example.com',
    passwordHash: 'unused',
    role: 'client',
  });
  const two = await repo.create({
    name: 'Two',
    email: 'two@example.com',
    passwordHash: 'unused',
    role: 'client',
  });
  const send = (user) =>
    request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${signAccessToken(user)}`)
      .set('Idempotency-Key', randomUUID())
      .send({ gigId: randomUUID() });
  assert.equal((await send(one)).status, 404);
  assert.equal((await send(one)).status, 404);
  const limited = await send(one);
  assert.equal(limited.status, 429);
  assert.ok(limited.headers['retry-after']);
  assert.equal((await send(two)).status, 404);
});
