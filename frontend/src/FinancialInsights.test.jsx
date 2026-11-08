import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './auth';
import FinancialInsights from './FinancialInsights';
const year = new Date().getUTCFullYear();
const insights = {
  year,
  incomeCents: 250050,
  taxCents: 50010,
  netCents: 200040,
  bookingCount: 1,
  taxRatePercent: 20,
  months: Array.from({ length: 12 }, (_, i) => ({
    month: `${year}-${String(i + 1).padStart(2, '0')}`,
    incomeCents: i ? 0 : 250050,
    taxCents: i ? 0 : 50010,
    netCents: i ? 0 : 200040,
  })),
};
function show() {
  return render(
    <MemoryRouter>
      <AuthProvider
        initialSession={{ token: 'test-token', user: { name: 'Maker', role: 'freelancer' } }}
      >
        <FinancialInsights />
      </AuthProvider>
    </MemoryRouter>,
  );
}
beforeEach(() =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ insights }) })),
  ),
);
describe('financial insights', () => {
  it('renders income, estimated reserve and net summary with an accessible chart/table', async () => {
    const user = userEvent.setup();
    show();
    const gross = await screen.findByText('Gross simulated income');
    expect(within(gross.closest('article')).getByText(/2 500,50/)).toBeInTheDocument();
    expect(
      within(screen.getByText(/Estimated tax reserve ·/).closest('article')).getByText(/500,10/),
    ).toBeInTheDocument();
    expect(
      within(screen.getByText('After estimated reserve').closest('article')).getByText(/2 000,40/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: `Monthly income and estimated tax for ${year}` }),
    ).toBeInTheDocument();
    expect(screen.getByText(/not a SARS calculation/)).toBeInTheDocument();
    await user.click(screen.getByText('View monthly breakdown'));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(13);
  });
  it('loads another selected calendar year with bearer authentication', async () => {
    const user = userEvent.setup();
    show();
    await screen.findByText(/Gross simulated income/);
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Financial year' }),
      String(year - 1),
    );
    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        `/api/financial-insights?year=${year - 1}`,
        expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }),
      ),
    );
  });
  it('reports a failed request and offers a working retry', async () => {
    fetch.mockRejectedValueOnce(new Error('private database details'));
    const user = userEvent.setup();
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not connect');
    expect(screen.getByRole('alert')).not.toHaveTextContent('private database');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Gross simulated income')).toBeInTheDocument();
  });
});
