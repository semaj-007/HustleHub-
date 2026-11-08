const { test } = require('node:test');
const assert = require('node:assert/strict');
const { financialInsights } = require('../src/modules/finance/finance.service');
const transaction = (amountCents, createdAt, freelancerId = 'owner') => ({
  freelancerId,
  amountCents,
  createdAt,
});
test('tax planning estimate sums monthly gross income at 20% with exact cent totals', () => {
  const result = financialInsights(
    [
      transaction(100001, '2026-01-02T00:00:00Z'),
      transaction(9999, '2026-01-03T00:00:00Z'),
      transaction(250050, '2026-02-01T00:00:00Z'),
    ],
    'owner',
    2026,
  );
  assert.equal(result.incomeCents, 360050);
  assert.equal(result.taxCents, 72010);
  assert.equal(result.netCents, 288040);
  assert.equal(result.months[0].taxCents, 22000);
  assert.equal(result.months[1].taxCents, 50010);
  assert.equal(
    result.taxCents,
    result.months.reduce((sum, month) => sum + month.taxCents, 0),
  );
});
test('calendar year in UTC and owner scope exclude unrelated or out-of-year transactions', () => {
  const result = financialInsights(
    [
      transaction(100, '2026-01-01T00:00:00Z'),
      transaction(1000, '2025-12-31T23:59:59Z'),
      transaction(99999, '2026-02-01T00:00:00Z', 'someone-else'),
      transaction(500, '2027-01-01T00:00:00Z'),
    ],
    'owner',
    2026,
  );
  assert.equal(result.incomeCents, 100);
  assert.equal(result.bookingCount, 1);
  assert.equal(result.taxCents, 20);
});
test('monthly rounding is nearest cent, including rounding multiple small bookings after aggregation', () => {
  const result = financialInsights(
    [
      transaction(101, '2026-01-01'),
      transaction(102, '2026-01-02'),
      transaction(102, '2026-02-01'),
    ],
    'owner',
    2026,
  );
  assert.equal(result.months[0].taxCents, 41);
  assert.equal(result.months[1].taxCents, 20);
  assert.equal(result.taxCents, 61);
});
test('zero income produces twelve complete zero-value months and an explicit explanation', () => {
  const result = financialInsights([], 'owner', 2026);
  assert.equal(result.months.length, 12);
  assert.equal(result.incomeCents, 0);
  assert.equal(result.taxCents, 0);
  assert.equal(result.netCents, 0);
  assert.match(result.disclaimer, /not a SARS calculation/);
  assert.match(result.method, /20%/);
});
