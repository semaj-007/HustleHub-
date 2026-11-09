import { useState, useEffect } from 'react';
import { Link, NavLink, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  Sparkles,
  Search,
  Grid2X2,
  SlidersHorizontal,
  ShieldCheck,
  Check,
  CheckCircle2,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  ReceiptText,
  Wallet,
  Clock3,
  LockKeyhole,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';
import FinancialInsights from './FinancialInsights';
import { useAuth, Protected } from './auth';
import { request, money, date, categories } from './api';
import { ErrorNotice, Loading, Empty, Modal, GigCard, categoryIcons } from './components';

function Shell({ children }) {
  const { user, logout, logoutError, loggingOut } = useAuth();
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <>
      <div className="announcement">
        <Sparkles size={13} /> A little ambition. A world of possibility.{' '}
        <span>Find your next collaboration.</span>
      </div>
      <header className="header">
        <Link to="/" className="brand" aria-label="HustleHub home">
          <span className="brand-mark">
            h
            <span>
              <ArrowUpRight size={20} />
            </span>
          </span>
          hustlehub<span className="brand-dot">.</span>
        </Link>
        <button
          className="icon-button mobile-toggle"
          aria-label="Toggle navigation"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          <Menu />
        </button>
        <nav className={menu ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
          <NavLink to="/" end>
            Explore talent
          </NavLink>
          {!user && <NavLink to="/login">Log in</NavLink>}
          {user && (
            <>
              <NavLink to="/workspace">My workspace</NavLink>
              <NavLink to="/bookings">Bookings</NavLink>
              <NavLink to="/transactions">Transactions</NavLink>
            </>
          )}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <span className="user-label">
                <span className="avatar">{user.name.slice(0, 1)}</span>
                <span>
                  {user.name}
                  <small>{user.role}</small>
                </span>
              </span>
              <button
                className="icon-button"
                aria-label="Log out"
                disabled={loggingOut}
                onClick={logout}
              >
                <LogOut size={19} />
              </button>
            </>
          ) : (
            <>
              <Link className="login-link" to="/login">
                Log in
              </Link>
              <Link className="button small" to="/register">
                Join the hub <ArrowUpRight size={16} />
              </Link>
            </>
          )}
        </div>
      </header>
      {logoutError && (
        <div className="page">
          <ErrorNotice error={logoutError} />
        </div>
      )}
      <main>{children}</main>
      <footer>
        <Link to="/" className="brand footer-brand">
          hustlehub<span className="brand-dot">.</span>
        </Link>
        <p>Good people. Great work. New possibilities.</p>
        <span>
          <ShieldCheck size={15} /> Secure connections. Simulated payments.
        </span>
      </footer>
    </>
  );
}

function Marketplace() {
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: '9',
      ...(query ? { q: query } : {}),
      ...(category ? { category } : {}),
    });
    request(`/gigs?${params}`, { signal: controller.signal })
      .then(setResult)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err);
      });
    return () => controller.abort();
  }, [query, category, page, retry]);
  return (
    <div className="page marketplace-page">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" /> MADE FOR THE WAY YOU WORK
          </div>
          <h1>
            Big ideas.
            <br />
            Meet <span>brilliant people.</span>
            <svg
              className="hero-spark"
              width="40"
              height="44"
              viewBox="0 0 40 44"
              aria-hidden="true"
            >
              <path
                d="M20 0v44M0 22h40M5 6l30 32M5 38L35 6"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </h1>
          <p>
            Find independent talent to bring your next idea to life.
            <br className="desktop-break" /> One project, one connection, one possibility at a time.
          </p>
          <div className="hero-note">
            <span>
              <Check size={14} /> Talent across disciplines
            </span>
            <span>
              <Check size={14} /> Simple, secure bookings
            </span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="visual-grid" />
          <span className="visual-star">
            <Asterisk size={68} strokeWidth={1.2} />
          </span>
          <div className="project-card">
            <span className="mini-label">YOUR NEXT BIG THING</span>
            <div className="project-symbol">
              a
              <span>
                <ArrowUpRight size={64} strokeWidth={1.5} />
              </span>
            </div>
            <div className="project-lines">
              <i />
              <i />
            </div>
            <span className="project-pill">
              <span className="status-dot" /> A fresh perspective
            </span>
          </div>
          <div className="floating-note note-one">
            <span className="note-icon">
              <Sparkles size={17} />
            </span>
            <div>
              Ideas into impact<small>That’s the hustle.</small>
            </div>
          </div>
          <div className="floating-note note-two">
            <span className="note-icon green">
              <Check size={18} />
            </span>
            <div>
              Your people are here<small>Let’s make it happen.</small>
            </div>
          </div>
        </div>
      </section>
      <section className="explore-section" aria-labelledby="explore-heading">
        <div className="section-top">
          <div>
            <div className="eyebrow muted">THE RIGHT PEOPLE, RIGHT HERE</div>
            <h2 id="explore-heading">
              Find your next great collaboration<span className="brand-dot">.</span>
            </h2>
          </div>
          <span className="section-caption">
            A little help goes a long way <ArrowUpRight size={18} />
          </span>
        </div>
        <div className="market-layout">
          <aside className="filter-panel">
            <h3>Explore categories</h3>
            <div className="category-list">
              <button
                className={!category ? 'category active' : 'category'}
                onClick={() => {
                  setCategory('');
                  setPage(1);
                }}
              >
                <Grid2X2 size={18} />
                All services
                <ChevronRight size={15} />
              </button>
              {categories.map((item) => {
                const Icon = categoryIcons[item.id];
                return (
                  <button
                    key={item.id}
                    className={category === item.id ? 'category active' : 'category'}
                    onClick={() => {
                      setCategory(item.id);
                      setPage(1);
                    }}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="aside-callout">
              <span className="callout-spark">
                <Asterisk size={38} strokeWidth={1.4} />
              </span>
              <h3>
                Your skills.
                <br />
                Someone’s next big idea.
              </h3>
              <p>Make a little room for your next opportunity.</p>
              <Link to="/register" className="text-link">
                Start freelancing <ArrowUpRight size={16} />
              </Link>
            </div>
            <p className="aside-trust">
              <ShieldCheck size={17} /> Built on secure connections
            </p>
          </aside>
          <div className="results">
            <div className="results-toolbar">
              <form
                className="search-box"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  setQuery(draft.trim());
                  setPage(1);
                }}
              >
                <Search size={18} />
                <input
                  aria-label="Search services"
                  placeholder="What do you need a hand with?"
                  maxLength={100}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button type="submit" aria-label="Search">
                  <ArrowRight size={18} />
                </button>
              </form>
              <span className="sort-label">
                <SlidersHorizontal size={16} /> Newest first
              </span>
            </div>
            <div className="results-meta">
              <p>
                {result
                  ? `${result.pagination.total} service${result.pagination.total === 1 ? '' : 's'} to move you forward`
                  : 'Discover something great'}
              </p>
              {(query || category) && (
                <button
                  className="text-link"
                  onClick={() => {
                    setCategory('');
                    setQuery('');
                    setDraft('');
                    setPage(1);
                  }}
                >
                  Clear filters
                </button>
              )}
              <span className="secure-tag">
                <LockKeyhole size={12} /> Book with confidence
              </span>
            </div>
            {error ? (
              <>
                <ErrorNotice error={error} />
                <button className="button secondary" onClick={() => setRetry(retry + 1)}>
                  Try again
                </button>
              </>
            ) : !result ? (
              <Loading />
            ) : result.gigs.length ? (
              <div className="gig-grid">
                {result.gigs.map((gig) => (
                  <GigCard key={gig.id} gig={gig} onSelect={setSelected} />
                ))}
              </div>
            ) : (
              <Empty
                title={query || category ? 'No services found' : 'Good things start with you'}
                action={
                  <Link className="button" to="/register">
                    Offer your skills <ArrowUpRight size={16} />
                  </Link>
                }
              >
                {query || category
                  ? 'Try another search or explore a different category.'
                  : 'The hub is just getting started. Be the first to share what you do best.'}
              </Empty>
            )}
            {result && result.pagination.pages > 1 && (
              <nav className="pagination" aria-label="Results pages">
                <button
                  className="button secondary small"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span>
                  Page {page} of {result.pagination.pages}
                </span>
                <button
                  className="button secondary small"
                  disabled={page >= result.pagination.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </div>
        </div>
      </section>
      <section className="bottom-banner">
        <span className="banner-symbol">
          <ArrowUpRight size={54} strokeWidth={1.1} />
        </span>
        <div>
          <h2>A little talent. A lot of possibility.</h2>
          <p>Turn what you do best into someone’s next breakthrough.</p>
        </div>
        <Link className="button dark" to="/register">
          Find your place <ArrowUpRight size={17} />
        </Link>
      </section>
      {selected && <BookingDialog gig={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export function BookingDialog({ gig, onClose }) {
  const { user, api } = useAuth();
  const [key] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      setConfirmation(await api('/bookings', { method: 'POST', body: { gigId: gig.id }, key }));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={confirmation ? 'You’re booked in!' : 'A great idea starts here'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {confirmation ? (
        <div className="confirmation">
          <span className="success-icon">
            <CheckCircle2 size={36} />
          </span>
          <h3>Your collaboration is confirmed.</h3>
          <p>{gig.title}</p>
          <div className="summary-line">
            <span>Total</span>
            <strong>{money(confirmation.transaction.amountCents)}</strong>
          </div>
          <p className="fine-print">
            This is a simulated payment. No money was charged. A transaction record has been created
            for you and the freelancer.
          </p>
          <Link className="button full" to="/bookings">
            View my bookings <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          <span className="pill">{categories.find((item) => item.id === gig.category)?.label}</span>
          <h3 className="detail-title">{gig.title}</h3>
          <p className="detail-description">{gig.description}</p>
          <p className="seller">By {gig.freelancerName}</p>
          <div className="booking-summary">
            <div className="summary-line">
              <span>
                <Clock3 size={16} /> Delivery time
              </span>
              <strong>{gig.deliveryDays} days</strong>
            </div>
            <div className="summary-line">
              <span>Project total</span>
              <strong>{money(gig.priceCents)}</strong>
            </div>
          </div>
          <ErrorNotice error={error} />
          {!user ? (
            <Link className="button full" to="/login">
              Log in to book <ArrowRight size={16} />
            </Link>
          ) : user.role !== 'client' ? (
            <p className="notice">
              Bookings are available to client accounts. Freelancers can manage their services in My
              workspace.
            </p>
          ) : (
            <button className="button full" disabled={busy} onClick={confirm}>
              {busy ? 'Confirming…' : 'Confirm simulated booking'}
              <ArrowRight size={16} />
            </button>
          )}
          <p className="fine-print">
            <ShieldCheck size={14} /> No real payment. No card details needed. The confirmed price
            is recorded securely on the server.
          </p>
        </>
      )}
    </Modal>
  );
}

export function AuthPage({ register = false }) {
  const { user, setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState('client');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (user) return <Navigate to="/workspace" replace />;
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (register) {
      delete values['account-type'];
      values.role = role;
    }
    try {
      const session = await request(register ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: values,
      });
      setSession(session);
      const from = location.state?.from;
      navigate(['/workspace', '/bookings', '/transactions'].includes(from) ? from : '/workspace', {
        replace: true,
      });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page auth-layout">
      <div className="auth-story">
        <div className="eyebrow">A PLACE FOR YOUR NEXT CHAPTER</div>
        <h1>
          {register ? (
            <>
              Your next big thing
              <br />
              starts with <em>hello.</em>
            </>
          ) : (
            <>
              Welcome back
              <br />
              to your <em>possibilities.</em>
            </>
          )}
        </h1>
        <p>
          A hub for independent thinkers, skilled makers, and people with a vision. Let’s do good
          work together.
        </p>
        <div className="auth-art" aria-hidden="true">
          h
          <span>
            <ArrowUpRight size={150} strokeWidth={1.1} />
          </span>
          <i>GOOD PEOPLE. GREAT WORK.</i>
        </div>
      </div>
      <div className="auth-form-panel">
        <span className="pill">
          <Sparkles size={13} /> THE HUB IS YOURS
        </span>
        <h2>{register ? 'Make yourself at home.' : 'Good to see you again.'}</h2>
        <p>
          {register
            ? 'Create your account and find your people.'
            : 'Log in to pick up where you left off.'}
        </p>
        <ErrorNotice error={error} />
        <form onSubmit={submit}>
          {register && (
            <>
              <fieldset className="role-picker">
                <legend>I’m here to…</legend>
                <label className={role === 'client' ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="account-type"
                    value="client"
                    checked={role === 'client'}
                    onChange={() => setRole('client')}
                  />
                  Find talent<small>Bring an idea to life</small>
                </label>
                <label className={role === 'freelancer' ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="account-type"
                    value="freelancer"
                    checked={role === 'freelancer'}
                    onChange={() => setRole('freelancer')}
                  />
                  Offer my skills<small>Build my freelance business</small>
                </label>
              </fieldset>
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                  placeholder="Your name"
                />
              </label>
            </>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={register ? 10 : undefined}
              maxLength={72}
              autoComplete={register ? 'new-password' : 'current-password'}
              placeholder={register ? 'Create a strong password' : 'Enter your password'}
            />
          </label>
          {register && (
            <p className="input-help">
              10+ characters, including uppercase, lowercase, and a number. Maximum 72 bytes.
            </p>
          )}
          <button className="button full" disabled={busy}>
            {busy ? 'One moment…' : register ? 'Create my account' : 'Log in'}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? 'Already part of the hub?' : 'New around here?'}{' '}
          <Link to={register ? '/login' : '/register'}>{register ? 'Log in' : 'Join the hub'}</Link>
        </p>
        <p className="fine-print">
          <LockKeyhole size={14} /> Your session stays in this tab. Log in again after a refresh.
        </p>
      </div>
    </div>
  );
}

function usePrivateData(paths) {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  const key = paths.join('|');
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(null);
    Promise.all(key.split('|').map((path) => api(path, { signal: controller.signal })))
      .then((parts) => setData(Object.assign({}, ...parts)))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err);
      });
    return () => controller.abort();
  }, [api, key, revision]);
  return { data, error, reload: () => setRevision((value) => value + 1) };
}
function PageIntro({ eyebrow, title, children, action }) {
  return (
    <div className="workspace-intro">
      <div>
        <div className="eyebrow muted">{eyebrow}</div>
        <h1>
          {title}
          <span className="brand-dot">.</span>
        </h1>
        <p>{children}</p>
      </div>
      {action}
    </div>
  );
}
function Workspace() {
  const { user } = useAuth();
  const freelancer = user.role === 'freelancer';
  const { data, error, reload } = usePrivateData(
    freelancer ? ['/gigs/mine', '/income', '/bookings'] : ['/bookings', '/transactions'],
  );
  const [financeRevision, setFinanceRevision] = useState(0);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  return (
    <div className="page workspace-page">
      <PageIntro
        eyebrow="YOUR CORNER OF THE HUB"
        title={`Let’s make things happen, ${user.name.split(' ')[0]}`}
        action={
          freelancer ? (
            <button className="button" onClick={() => setEditing({})}>
              <Plus size={17} /> Create a service
            </button>
          ) : (
            <Link className="button" to="/">
              Explore talent <ArrowUpRight size={17} />
            </Link>
          )
        }
      >
        {freelancer
          ? 'Manage your services, meet your clients, and keep your momentum.'
          : 'Your next collaboration is closer than you think. Keep track of it all here.'}
      </PageIntro>
      <ErrorNotice error={error} />
      {!data && !error ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="stats-grid">
              <Stat
                icon={Wallet}
                label={freelancer ? 'Simulated income' : 'Simulated spending'}
                value={money(
                  freelancer
                    ? data.income.totalCents
                    : data.transactions.reduce((sum, item) => sum + item.amountCents, 0),
                )}
                note="Demo transactions · no real money"
              />
              <Stat
                icon={ReceiptText}
                label="Confirmed bookings"
                value={data.bookings.length}
                note="Every collaboration, in one place"
              />
              <Stat
                icon={Sparkles}
                label={freelancer ? 'Published services' : 'Your role'}
                value={freelancer ? data.gigs.filter((gig) => gig.isActive).length : 'Client'}
                note={freelancer ? 'Ready for your next client' : 'Good ideas deserve great people'}
              />
            </div>
            {freelancer && <FinancialInsights revision={financeRevision} />}
            {freelancer ? (
              <section>
                <div className="section-top">
                  <h2>Your services</h2>
                  <span className="muted">{data.gigs.length} listings</span>
                </div>
                {data.gigs.length ? (
                  <div className="managed-gigs">
                    {data.gigs.map((gig) => (
                      <article className="managed-gig" key={gig.id}>
                        <span className={`managed-icon art-${gig.category}`}>
                          {(() => {
                            const Icon = categoryIcons[gig.category];
                            return <Icon size={25} />;
                          })()}
                        </span>
                        <div>
                          <span className={`badge ${gig.isActive ? '' : 'paused'}`}>
                            {gig.isActive ? 'Published' : 'Paused'}
                          </span>
                          <h3>{gig.title}</h3>
                          <p>
                            {money(gig.priceCents)} <span>· {gig.deliveryDays} day delivery</span>
                          </p>
                        </div>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label={`Edit ${gig.title}`}
                            onClick={() => setEditing(gig)}
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            className="icon-button danger"
                            aria-label={`Delete ${gig.title}`}
                            onClick={() => setDeleting(gig)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="Make your first introduction"
                    action={
                      <button className="button" onClick={() => setEditing({})}>
                        <Plus size={17} /> Create a service
                      </button>
                    }
                  >
                    Share what you do best. Your first collaboration starts with a great listing.
                  </Empty>
                )}
              </section>
            ) : (
              <section className="client-callout">
                <Sparkles size={30} />
                <div>
                  <h2>What’s your next big idea?</h2>
                  <p>Find the skills to take it from “what if” to “let’s do this.”</p>
                </div>
                <Link className="button secondary" to="/">
                  Browse services <ArrowRight size={16} />
                </Link>
              </section>
            )}
            <div className="section-top">
              <h2>Recent collaborations</h2>
              <Link className="text-link" to="/bookings">
                All bookings <ArrowRight size={16} />
              </Link>
            </div>
            <BookingList bookings={data.bookings.slice(0, 5)} />
          </>
        )
      )}
      {editing && (
        <GigEditor
          gig={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
            setFinanceRevision((value) => value + 1);
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          gig={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            reload();
            setFinanceRevision((value) => value + 1);
          }}
        />
      )}
    </div>
  );
}
function Stat({ icon: Icon, label, value, note }) {
  return (
    <article className="stat">
      <span className="stat-icon">
        <Icon size={20} />
      </span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

export function GigEditor({ gig, onClose, onSaved }) {
  const { api } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const rawPrice = form.get('price');
    const [whole, decimals = '', ...extraParts] = rawPrice.split('.');
    if (extraParts.length || !/^\d{1,7}$/.test(whole) || !/^\d{0,2}$/.test(decimals)) {
      setError(new Error('Enter a price with at most two decimal places.'));
      setBusy(false);
      return;
    }
    const body = {
      title: form.get('title'),
      description: form.get('description'),
      category: form.get('category'),
      priceCents: Math.round(Number(rawPrice) * 100),
      deliveryDays: Number(form.get('deliveryDays')),
      isActive: form.get('isActive') === 'on',
    };
    try {
      await api(gig.id ? `/gigs/${gig.id}` : '/gigs', { method: gig.id ? 'PATCH' : 'POST', body });
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={gig.id ? 'A little refresh for your service.' : 'Put your skills out there.'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p className="muted">Be clear, be specific, and show people what you can do.</p>
      <ErrorNotice error={error} />
      <form onSubmit={submit}>
        <label>
          Service title
          <input
            name="title"
            required
            minLength={5}
            maxLength={100}
            defaultValue={gig.title}
            placeholder="I will build a beautiful website for your business"
          />
        </label>
        <label>
          Category
          <select name="category" defaultValue={gig.category || 'design'}>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Description
          <textarea
            name="description"
            required
            minLength={20}
            maxLength={2000}
            rows={4}
            defaultValue={gig.description}
            placeholder="Tell clients what’s included and what makes your service special…"
          />
        </label>
        <div className="form-row">
          <label>
            Price (ZAR)
            <input
              name="price"
              type="number"
              required
              min="1"
              max="1000000"
              step="0.01"
              defaultValue={gig.priceCents ? (gig.priceCents / 100).toFixed(2) : ''}
              placeholder="500.00"
            />
          </label>
          <label>
            Delivery (days)
            <input
              name="deliveryDays"
              type="number"
              required
              min="1"
              max="90"
              step="1"
              defaultValue={gig.deliveryDays || 3}
            />
          </label>
        </div>
        <label className="checkbox-label">
          <input type="checkbox" name="isActive" defaultChecked={gig.isActive ?? true} /> Publish
          this service for clients to discover
        </label>
        <p className="fine-print">
          Use plain text. HTML is not accepted. Paused services are visible only in your workspace.
        </p>
        <button className="button full" disabled={busy}>
          {busy ? 'Saving…' : gig.id ? 'Save changes' : 'Create service'}
          <ArrowUpRight size={17} />
        </button>
      </form>
    </Modal>
  );
}
function DeleteDialog({ gig, onClose, onDeleted }) {
  const { api } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api(`/gigs/${gig.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Remove this service?"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p>
        {gig.title} will no longer be available for booking. Existing bookings and transaction
        records will be kept.
      </p>
      <ErrorNotice error={error} />
      <div className="modal-actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Keep service
        </button>
        <button className="button destructive" disabled={busy} onClick={remove}>
          {busy ? 'Removing…' : 'Remove service'}
        </button>
      </div>
    </Modal>
  );
}
function BookingList({ bookings }) {
  if (!bookings.length)
    return (
      <Empty title="Your next collaboration is waiting">
        Confirmed bookings will appear here. Every booking includes a simulated transaction.
      </Empty>
    );
  return (
    <div className="record-list">
      {bookings.map((item) => (
        <article className="record" key={item.id}>
          <span className="record-icon">
            <CheckCircle2 size={21} />
          </span>
          <div className="record-main">
            <span className="badge">Confirmed</span>
            <h3>{item.gigTitle}</h3>
            <p>
              {date(item.createdAt)} · {item.deliveryDays} day delivery
            </p>
            <small className="record-id">Booking {item.id}</small>
          </div>
          <div className="record-price">
            <strong>{money(item.amountCents)}</strong>
            <span>Simulated payment</span>
          </div>
        </article>
      ))}
    </div>
  );
}
function Bookings() {
  const { user } = useAuth();
  const { data, error, reload } = usePrivateData(['/bookings']);
  return (
    <div className="page workspace-page">
      <PageIntro eyebrow="GOOD WORK STARTS HERE" title="Your bookings">
        {user.role === 'freelancer'
          ? 'The projects your clients have booked with you.'
          : 'Your projects, confirmed and ready for what’s next.'}
      </PageIntro>
      <ErrorNotice error={error} />
      {error && (
        <button className="button secondary" onClick={reload}>
          Try again
        </button>
      )}
      {data ? <BookingList bookings={data.bookings} /> : !error && <Loading />}
    </div>
  );
}
function Transactions() {
  const { data, error, reload } = usePrivateData(['/transactions']);
  return (
    <div className="page workspace-page">
      <PageIntro eyebrow="A CLEAR PICTURE" title="Your transactions">
        A record of every confirmed collaboration. All payments are simulated; no real money changes
        hands.
      </PageIntro>
      <ErrorNotice error={error} />
      {error && (
        <button className="button secondary" onClick={reload}>
          Try again
        </button>
      )}
      {!data && !error ? (
        <Loading />
      ) : (
        data &&
        (data.transactions.length ? (
          <div className="record-list">
            {data.transactions.map((item) => (
              <article className="record" key={item.id}>
                <span className="record-icon">
                  <ReceiptText size={21} />
                </span>
                <div className="record-main">
                  <span className="badge neutral">Simulated</span>
                  <h3>{item.gigTitle}</h3>
                  <p>{date(item.createdAt)}</p>
                  <small className="record-id">
                    Transaction {item.id}
                    <br />
                    Booking {item.bookingId}
                  </small>
                </div>
                <div className="record-price">
                  <strong>{money(item.amountCents)}</strong>
                  <span>No real payment</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="Everything accounted for">
            Your transaction records will appear here after your first booking.
          </Empty>
        ))
      )}
    </div>
  );
}
export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Marketplace />} />
        <Route path="/login" element={<AuthPage key="login" />} />
        <Route path="/register" element={<AuthPage key="register" register />} />
        <Route
          path="/workspace"
          element={
            <Protected>
              <Workspace />
            </Protected>
          }
        />
        <Route
          path="/bookings"
          element={
            <Protected>
              <Bookings />
            </Protected>
          }
        />
        <Route
          path="/transactions"
          element={
            <Protected>
              <Transactions />
            </Protected>
          }
        />
        <Route
          path="*"
          element={
            <div className="page not-found">
              <h1>This path has a different plan.</h1>
              <p>The page you’re looking for isn’t here.</p>
              <Link className="button" to="/">
                Back to the hub <ArrowRight size={17} />
              </Link>
            </div>
          }
        />
      </Routes>
    </Shell>
  );
}
