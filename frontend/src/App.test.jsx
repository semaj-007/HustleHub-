import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App, { BookingDialog, GigEditor } from './App';
import { AuthProvider } from './auth';
import { GigCard } from './components';
import { request } from './api';
const gig = {
  id: '1d4aa722-820e-4005-b170-07a0122c1174',
  title: 'A thoughtful brand identity',
  description: 'An original identity to help your small business grow.',
  category: 'design',
  priceCents: 150000,
  deliveryDays: 3,
  freelancerId: 'owner',
  freelancerName: 'Ava Studio',
};
const session = (role = 'client') => ({
  token: 'private-test-token',
  user: { id: role, name: 'Alex Maker', role },
});
const response = (data, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: async () => data });
function renderApp(path = '/', auth = null) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider initialSession={auth}>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}
function renderPrivate(component, auth = session()) {
  return render(
    <MemoryRouter>
      <AuthProvider initialSession={auth}>{component}</AuthProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => response({ gigs: [gig], pagination: { total: 1, pages: 1 } })),
  );
  localStorage.clear();
  sessionStorage.clear();
});
describe('Marketplace', () => {
  it('renders services and submits a search through the API', async () => {
    const user = userEvent.setup();
    renderApp();
    expect(screen.getByRole('heading', { name: /Big ideas/ })).toBeInTheDocument();
    expect(await screen.findByText(gig.title)).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Search services' }), 'brand');
    await user.click(screen.getByRole('button', { name: 'Search', exact: true }));
    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('q=brand'),
        expect.any(Object),
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Development', exact: true }));
    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('category=development'),
        expect.any(Object),
      ),
    );
  });
  it('handles an empty marketplace without invented listings', async () => {
    fetch.mockImplementation(() => response({ gigs: [], pagination: { total: 0, pages: 0 } }));
    renderApp();
    expect(await screen.findByText('Good things start with you')).toBeInTheDocument();
    expect(screen.getByText('0 services to move you forward')).toBeInTheDocument();
  });
  it('renders service text safely without creating injected elements', () => {
    const { container } = render(
      <GigCard gig={{ ...gig, title: '<img src=x onerror=alert(1)>' }} onSelect={() => {}} />,
    );
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});
describe('Authentication', () => {
  it('redirects guests from protected workspaces to login', async () => {
    renderApp('/workspace');
    expect(
      await screen.findByRole('heading', { name: 'Good to see you again.' }),
    ).toBeInTheDocument();
  });
  it('registers a freelancer using only the allowed input fields', async () => {
    const user = userEvent.setup();
    fetch.mockImplementation((url) =>
      url.endsWith('/auth/register')
        ? response(session('freelancer'), 201)
        : url.includes('income')
          ? response({ income: { totalCents: 0 } })
          : url.includes('bookings')
            ? response({ bookings: [] })
            : response({ gigs: [] }),
    );
    renderApp('/register');
    await user.click(screen.getByLabelText(/Offer my skills/));
    await user.type(screen.getByLabelText('Full name'), 'Alex Maker');
    await user.type(screen.getByLabelText('Email address'), 'alex@example.com');
    await user.type(screen.getByLabelText('Password'), 'StrongPassword123');
    await user.click(screen.getByRole('button', { name: 'Create my account' }));
    expect(await screen.findByText('Your services')).toBeInTheDocument();
    const args = fetch.mock.calls.find(([url]) => url === '/api/auth/register');
    expect(JSON.parse(args[1].body)).toEqual({
      name: 'Alex Maker',
      email: 'alex@example.com',
      password: 'StrongPassword123',
      role: 'freelancer',
    });
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
  it('shows authored validation errors without echoing passwords', async () => {
    fetch.mockImplementation(() =>
      response(
        {
          error: {
            message: 'Validation failed',
            details: [{ field: 'email', message: 'Enter a valid email address' }],
          },
        },
        400,
      ),
    );
    const user = userEvent.setup();
    renderApp('/login');
    await user.type(screen.getByLabelText('Email address'), 'alex@example.com');
    await user.type(screen.getByLabelText('Password'), 'SecretPassword123');
    await user.click(screen.getByRole('button', { name: 'Log in', exact: true }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Enter a valid email address');
    expect(alert).not.toHaveTextContent('SecretPassword123');
  });
  it('logs out locally and removes access to protected pages', async () => {
    const user = userEvent.setup();
    renderApp('/', session());
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(screen.queryByRole('link', { name: 'My workspace' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Join the hub' })).toBeInTheDocument();
  });
});
describe('Booking and listing interactions', () => {
  it('confirms a booking with an idempotency key and no user-supplied price or owner', async () => {
    fetch.mockImplementation(() =>
      response({ booking: { id: 'booking' }, transaction: { amountCents: 150000 } }, 201),
    );
    const user = userEvent.setup();
    renderPrivate(<BookingDialog gig={gig} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Confirm simulated booking' }));
    expect(await screen.findByRole('heading', { name: 'You’re booked in!' })).toBeInTheDocument();
    const [, options] = fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ gigId: gig.id });
    expect(options.headers.Authorization).toBe('Bearer private-test-token');
    expect(options.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.getByText(/No money was charged/)).toBeInTheDocument();
  });
  it('reuses the confirmation key after a failed request and preserves safe feedback', async () => {
    fetch
      .mockImplementationOnce(() => Promise.reject(new Error('Database password=do-not-expose')))
      .mockImplementationOnce(() =>
        response({ booking: {}, transaction: { amountCents: 150000 } }, 201),
      );
    const user = userEvent.setup();
    renderPrivate(<BookingDialog gig={gig} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Confirm simulated booking' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not connect');
    expect(screen.getByRole('alert')).not.toHaveTextContent('do-not-expose');
    await user.click(screen.getByRole('button', { name: 'Confirm simulated booking' }));
    await screen.findByText('Your collaboration is confirmed.');
    expect(fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe(
      fetch.mock.calls[1][1].headers['Idempotency-Key'],
    );
  });
  it('shows freelancer guidance instead of a booking action', () => {
    renderPrivate(<BookingDialog gig={gig} onClose={() => {}} />, session('freelancer'));
    expect(
      screen.queryByRole('button', { name: 'Confirm simulated booking' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Bookings are available to client accounts/)).toBeInTheDocument();
  });
  it('creates a service using integer cents and explicit availability', async () => {
    fetch.mockImplementation(() => response({ gig }, 201));
    const saved = vi.fn();
    const user = userEvent.setup();
    renderPrivate(<GigEditor gig={{}} onClose={() => {}} onSaved={saved} />, session('freelancer'));
    await user.type(screen.getByLabelText('Service title'), gig.title);
    await user.type(screen.getByLabelText('Description'), gig.description);
    await user.type(screen.getByLabelText('Price (ZAR)'), '1500.50');
    await user.click(screen.getByRole('button', { name: 'Create service' }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      priceCents: 150050,
      isActive: true,
      deliveryDays: 3,
    });
  });
  it('conceals unexpected server errors', async () => {
    fetch.mockImplementation(() =>
      response({ error: { message: 'Internal SQL password secret' } }, 500),
    );
    await expect(request('/gigs')).rejects.toThrow('Something went wrong. Please try again.');
  });
});
