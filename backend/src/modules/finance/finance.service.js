// Educational planning estimate, not a statutory SARS tax calculation.
const TAX_RATE_PERCENT = 20;
function financialInsights(transactions, freelancerId, year) {
  const months = Array.from({ length: 12 }, (_, index) => ({
    month: `${year}-${String(index + 1).padStart(2, '0')}`,
    incomeCents: 0,
    taxCents: 0,
    netCents: 0,
    bookingCount: 0,
  }));
  for (const transaction of transactions) {
    if (transaction.freelancerId !== freelancerId) continue;
    const date = new Date(transaction.createdAt);
    if (date.getUTCFullYear() !== year) continue;
    const month = months[date.getUTCMonth()];
    month.incomeCents += transaction.amountCents;
    month.bookingCount++;
  }
  // Round each monthly reserve to the nearest cent. Annual totals sum these
  // reserves, so every chart/table value reconciles exactly with the summary.
  for (const month of months) {
    month.taxCents = Number((BigInt(month.incomeCents) * 20n + 50n) / 100n);
    month.netCents = month.incomeCents - month.taxCents;
  }
  return {
    year,
    currency: 'ZAR',
    paymentMode: 'simulated',
    taxRatePercent: TAX_RATE_PERCENT,
    method:
      '20% of monthly gross simulated income, rounded to the nearest cent; annual estimate is the sum of monthly estimates. No deductions, rebates, other income, or annualisation.',
    disclaimer:
      'Illustrative planning estimate, not a SARS calculation or tax advice. No actual income or tax payment occurs.',
    incomeCents: months.reduce((sum, month) => sum + month.incomeCents, 0),
    taxCents: months.reduce((sum, month) => sum + month.taxCents, 0),
    netCents: months.reduce((sum, month) => sum + month.netCents, 0),
    bookingCount: months.reduce((sum, month) => sum + month.bookingCount, 0),
    months,
  };
}
module.exports = { financialInsights };
