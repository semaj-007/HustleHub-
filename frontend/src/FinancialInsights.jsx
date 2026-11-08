import { useEffect, useState } from 'react';
import { TrendingUp, Info, RefreshCw } from 'lucide-react';
import { useAuth } from './auth';
import { money } from './api';
import { ErrorNotice, Loading } from './components';

export default function FinancialInsights({ revision = 0 }) {
  const { api } = useAuth();
  const currentYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(currentYear);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setInsights(null);
    setError(null);
    api(`/financial-insights?year=${year}`, { signal: controller.signal })
      .then((result) => setInsights(result.insights))
      .catch((failure) => {
        if (failure.name !== 'AbortError') setError(failure);
      });
    return () => controller.abort();
  }, [api, year, revision, reload]);
  const maximum = insights
    ? Math.max(100, ...insights.months.map((month) => month.incomeCents))
    : 100;
  return (
    <section className="finance-panel" aria-labelledby="finance-title">
      <div className="finance-heading">
        <div>
          <span className="eyebrow">A CLEARER PICTURE</span>
          <h2 id="finance-title">
            <TrendingUp size={22} /> Your financial outlook
          </h2>
          <p>Your simulated earnings, with a little room to plan ahead.</p>
        </div>
        <label className="year-select">
          Calendar year
          <select
            aria-label="Financial year"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {Array.from({ length: 6 }, (_, i) => (
              <option key={currentYear - i} value={currentYear - i}>
                {currentYear - i}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ErrorNotice error={error} />
      {error && (
        <button className="button secondary" onClick={() => setReload(reload + 1)}>
          <RefreshCw size={15} /> Try again
        </button>
      )}
      {!insights && !error ? (
        <Loading />
      ) : (
        insights && (
          <>
            <div className="finance-summaries">
              <article>
                <span>Gross simulated income</span>
                <strong>{money(insights.incomeCents)}</strong>
                <small>
                  {insights.bookingCount} confirmed bookings in {year}
                </small>
              </article>
              <article className="tax-summary">
                <span>Estimated tax reserve · {insights.taxRatePercent}%</span>
                <strong>{money(insights.taxCents)}</strong>
                <small>Illustrative planning estimate</small>
              </article>
              <article>
                <span>After estimated reserve</span>
                <strong>{money(insights.netCents)}</strong>
                <small>Income less estimated tax reserve</small>
              </article>
            </div>
            <div className="chart-caption">
              <h3>Month by month</h3>
              <span>
                <i className="legend-income" /> Income <i className="legend-tax" /> Tax reserve
              </span>
            </div>
            <svg
              className="income-chart"
              role="img"
              aria-labelledby="chart-title"
              aria-describedby="chart-description"
              viewBox="0 0 720 185"
            >
              <title id="chart-title">Monthly income and estimated tax for {year}</title>
              <desc id="chart-description">
                Purple bars show gross simulated income. Lilac bars show the 20% tax reserve. Exact
                amounts are in the monthly breakdown table.
              </desc>
              <line x1="10" y1="150" x2="710" y2="150" stroke="#e7e2f2" />
              {insights.months.map((month, index) => {
                const incomeHeight = (month.incomeCents / maximum) * 118;
                const taxHeight = (month.taxCents / maximum) * 118;
                return (
                  <g key={month.month}>
                    <rect
                      x={index * 59 + 18}
                      y={150 - incomeHeight}
                      width="17"
                      height={incomeHeight}
                      rx="3"
                      fill="#6045d9"
                    />
                    <rect
                      x={index * 59 + 37}
                      y={150 - taxHeight}
                      width="12"
                      height={taxHeight}
                      rx="3"
                      fill="#c7b7f3"
                    />
                    <text
                      x={index * 59 + 32}
                      y="175"
                      textAnchor="middle"
                      fill="#827992"
                      fontSize="10"
                    >
                      {new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(
                        new Date(`${month.month}-01T00:00:00Z`),
                      )}
                    </text>
                    <title>
                      {month.month}: income {money(month.incomeCents)}, tax reserve{' '}
                      {money(month.taxCents)}
                    </title>
                  </g>
                );
              })}
            </svg>
            <details className="finance-breakdown">
              <summary>View monthly breakdown</summary>
              <div className="table-scroll">
                <table>
                  <caption>Financial breakdown for {year} in ZAR</caption>
                  <thead>
                    <tr>
                      <th scope="col">Month</th>
                      <th scope="col">Income</th>
                      <th scope="col">Estimated reserve</th>
                      <th scope="col">After reserve</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.months.map((month) => (
                      <tr key={month.month}>
                        <th scope="row">{month.month}</th>
                        <td>{money(month.incomeCents)}</td>
                        <td>{money(month.taxCents)}</td>
                        <td>{money(month.netCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <p className="finance-explanation">
              <Info size={16} />
              <span>
                <strong>How the estimate works:</strong> 20% of each month’s gross simulated income,
                rounded to cents, then added for the year. No deductions, rebates, or other income
                are included. This is a planning illustration, not a SARS calculation or tax advice.
                No real funds or taxes are paid.
              </span>
            </p>
          </>
        )
      )}
    </section>
  );
}
