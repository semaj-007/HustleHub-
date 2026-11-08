# HustleHub — Secure freelance marketplace

A full-stack marketplace for independent talent. Clients discover services and confirm bookings; freelancers manage their listings, see their bookings, and track simulated income. React provides the interface and an Express HTTPS API enforces the security boundaries.

## Features

- Register as a **client** or **freelancer**, log in, and view your own profile.
- Browse published gigs without an account. Search by title, description, or freelancer name; filter by category and page through results.
- Freelancers create, edit, pause, privately view, and delete their own listings. Each listing has a description, category, price in ZAR, and delivery time.
- Clients confirm bookings. The server reads the current gig price, assigns both participants, and creates a booking **and** a simulated transaction together.
- Both participants can see their bookings and transaction history. Freelancers see income calculated from transactions attributed to them.
- Booking retries reuse a confirmation key and return the existing records instead of duplicating income. Updating or deleting a gig never changes historical booking prices or removes transactions.
- Responsive React interface with client/freelancer workspaces, loading and empty states, validation messages, confirmation dialogs, and keyboard-accessible forms.

**Payments are simulated.** No card details are requested, no funds move, and “income” is a demonstration total, not settled revenue. Tax calculations, messaging, cancellations, fulfillment workflows, and admin management screens are outside this implementation.

## Run locally

Requirements: **Node.js 22.12+** (Node 24 recommended), npm, and OpenSSL on PATH. No external database, API keys, or payment account is required.

In a managed cloud environment with a read-only home directory, first run `export NPM_CONFIG_CACHE=/workspace/.npm-cache`. On a normal local machine, npm’s default cache works.

From the repository root:

```bash
npm ci
npm run setup
npm run dev
```

`setup` installs backend/frontend dependencies from their lockfiles. It creates an ignored `backend/.env` with a cryptographically random development JWT secret if no `.env` or injected `JWT_SECRET` exists. It generates a localhost certificate/key pair only if both are absent. Existing local files are preserved; an incomplete TLS pair causes setup to fail explicitly.

Open **https://localhost:5173**. Trust the generated local certificate in your development browser/OS. It is self-signed and covers `localhost` and `127.0.0.1`. The API listens on **https://localhost:8443**; Vite proxies `/api` to it and verifies the API using the local certificate. Do not disable TLS verification for dependency downloads or remote connections.

To run the applications separately:

```bash
# Terminal 1, from repository root
npm run dev --prefix backend

# Terminal 2, from repository root
npm run dev --prefix frontend
```

For a production-style build served by a single HTTPS process:

```bash
npm run build
npm start
# Open https://localhost:8443
```

Express serves the compiled React app and API from the same origin. Stop any existing backend process before restarting on the same port. In a real deployment, supply a trusted TLS certificate and deployment-specific secret, use `NODE_ENV=production`, and run one Node process with this storage implementation.

The marketplace intentionally starts empty. To try the complete flow, register a freelancer, create a published service, then use a separate browser tab/context to register a client and book it. Return to the freelancer workspace to see the booking and simulated income. There are no hard-coded demo accounts or default passwords.

### Configuration

See [`backend/.env.example`](backend/.env.example) for supported settings. `npm run setup` generates the required local secret; copying the example without replacing its placeholder will deliberately fail startup. Existing exported variables take precedence over `.env`. Never commit secrets, private keys, or runtime data. Only `backend/src/config/env.js` reads application environment configuration.

| Variable                                                 | Default / purpose                                                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `JWT_SECRET`                                             | Required, random secret with at least 32 characters; placeholder rejected in every environment |
| `NODE_ENV`                                               | `development`; set `production` for deployment                                                 |
| `PORT`                                                   | `8443`                                                                                         |
| `JWT_EXPIRES_IN`, `JWT_ISSUER`                           | `1h`, `hustlehub-plus-api`                                                                     |
| `HTTPS_KEY_PATH`, `HTTPS_CERT_PATH`                      | `./certs/key.pem`, `./certs/cert.pem`, relative to backend working directory                   |
| `CORS_ORIGIN`                                            | `https://localhost:5173`; comma-separated explicit origins                                     |
| `USER_STORE_PATH`                                        | `./src/data/users.json`                                                                        |
| `MARKETPLACE_STORE_PATH`                                 | `./src/data/marketplace.json`                                                                  |
| `BCRYPT_SALT_ROUNDS`                                     | `12`; automated tests alone use `4` to keep isolated fixtures fast                             |
| `AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS`       | 10 attempts per IP per 900000 ms, shared by login/register                                     |
| `BOOKING_RATE_LIMIT_MAX`, `BOOKING_RATE_LIMIT_WINDOW_MS` | 20 booking requests per authenticated user per 900000 ms                                       |

Vite reads `PORT`, `HTTPS_CERT_PATH`, and `HTTPS_KEY_PATH` from `backend/.env` (exported variables take precedence), so its HTTPS files and default proxy target match the API. Relative TLS paths resolve from `backend/`. An exported `API_TARGET` overrides the proxy target and must use HTTPS. These settings are used only by the development server and are never exposed to browser code. Frontend requests always use relative `/api` URLs, with no embedded secret or bearer token.

If Vite reports `unable to verify the first certificate`, stop and restart **both** development servers after a certificate change. The proxy preserves Node’s default CA trust, system CA roots where supported, and `NODE_EXTRA_CA_CERTS`; it also trusts the configured self-signed development certificate. For a certificate signed by a private CA, supply the CA’s PEM bundle (relative paths resolve from `frontend/`):

```bash
API_CA_PATH=/absolute/path/to/root-ca.pem npm run dev
```

In PowerShell, set `$env:API_CA_PATH = 'C:\certs\root-ca.pem'` before `npm run dev`. The API certificate file should include its leaf certificate and any intermediate certificates required by that CA. Do not use `secure: false` or `NODE_TLS_REJECT_UNAUTHORIZED=0`: hostname and certificate verification remain enabled. A mismatched certificate or unknown CA is still rejected.

## Security and access control

The interface hides irrelevant actions for each role; **the backend independently authenticates and authorizes every protected request**. Changing the UI or sending a crafted HTTP request does not bypass these checks.

| Operation                                    | Guest | Client           | Freelancer                           |
| -------------------------------------------- | ----- | ---------------- | ------------------------------------ |
| Browse/read published, available gigs        | Yes   | Yes              | Yes                                  |
| Create a gig                                 | No    | No               | Yes, owned by the authenticated user |
| Privately view, edit, pause, or delete a gig | No    | No               | Own gigs only                        |
| Confirm a booking                            | No    | Yes              | No                                   |
| List/read bookings and transactions          | No    | Participant only | Participant only                     |
| View freelancer income                       | No    | No               | Own total only                       |

Published gig descriptions, prices, and freelancer display names are intentionally public marketplace information. Paused listings and management views are private. Reads and writes for another freelancer's private gig, or an unrelated booking/transaction ID, return **404**, just like a nonexistent resource. Wrong-role operations return **403**; missing, expired, malformed, or invalid tokens return **401**. There is no admin bypass of ownership checks and no public admin registration.

- **JWT:** bearer tokens signed and verified using an explicit HS256 allowlist, issuer, and expiry. Middleware reloads the user and their current role from storage, so a stale role claim cannot grant additional permissions. Participant and owner IDs come from the authenticated identity, never the request body or query string.
- **Session handling:** JWTs live only in React memory, never local/session storage, query strings, or cookies. Refreshing requires login again. Logout clears the local session; an issued token remains valid until expiry (there is no server revocation list). Unauthorized API responses clear the session. API/private responses use `Cache-Control: no-store`.
- **Passwords:** bcrypt hashes only; default cost 12. Registration requires 10+ characters including uppercase, lowercase, and a number. The 72-byte bcrypt limit is enforced to prevent silent truncation, including for Unicode passwords. Login errors do not distinguish nonexistent accounts from wrong passwords. Passwords and hashes are never returned.
- **Input:** strict allowlists of body fields, type/length checks, bounded integers, category enums, UUIDs, trimmed plain text with non-printing controls removed, and rejection of HTML. Numeric gig prices are stored in **integer cents**. There is no user-controlled database query execution. React renders user content as escaped text; there is no `dangerouslySetInnerHTML`. Error details include safe field names/messages, never submitted values.
- **Booking integrity:** requires a UUID `Idempotency-Key`, scoped to the client. Concurrent retries produce one booking and transaction. Reusing a key for a different gig returns 409. Booking and transaction records are committed in one atomic file replacement, with price, title, delivery time, and participant snapshots derived server-side. Income is summed from the correct freelancer's immutable transactions. Price/owner/status injection is rejected.
- **Rate limiting:** IP-based authentication limiter; account-based booking limiter after JWT authentication; account-based gig mutation limiter (60 per 15 minutes). A 429 response has a JSON error and retry headers. These are single-process, in-memory limits; restarts reset them. A distributed deployment needs a shared limiter store. Trust-proxy is not enabled blindly; configure it deliberately before deployment behind a proxy.
- **Transport and headers:** HTTPS-only API, TLS pair required, Helmet headers, HSTS, no-sniff, no-referrer, no framework header, and explicit CORS origins. The production app's **Content Security Policy** permits same-origin scripts, styles, fonts, and API connections; disallows objects, framing, base URI, inline scripts, and `eval`. No CDN scripts/fonts are needed. Vite is a development server; use the Express-served build to verify the deployment CSP.
- **Errors and logs:** malformed JSON returns 400, oversized bodies return 413, validation returns 400, and unexpected failures return a generic 500. Requests log method/path/status/duration without bodies or authorization headers; sensitive structured fields are redacted. No stack traces or configuration secrets are sent to the browser.
- **Storage:** ignored local JSON files; new data files have mode `0600`. Serialized read-modify-write operations prevent lost concurrent updates and duplicate registrations. Atomic rename prevents partial files. Corrupt data fails closed rather than being overwritten. Listing deletion retains financial history.

### Deployment limits

File-backed persistence is appropriate for this single-process coursework/demo application. It is **not** a horizontally scalable database: do not run multiple API workers against these files. A real deployment needs a transactional database, migrations/backups, shared rate limiting, and any required account recovery/token revocation and payment settlement controls. No production-readiness claim or real payment guarantee is implied.

The current backend runtime, frontend, and root-tool production audits report no known vulnerabilities. Newman’s development-only dependency tree still reports advisories (including critical/high findings). Use it only with this trusted collection and isolated test data; the API does not load Newman in normal operation. Do not apply `npm audit fix --force` blindly, because it proposes incompatible tool downgrades.

## API reference

All write bodies are JSON. Protected requests use `Authorization: Bearer <token>`. Errors use `{ "error": { "message": "…", "details": [{ "field": "…", "message": "…" }] } }`; `details` is present only for validation errors.

| Method and endpoint                                  | Purpose / authorization                                                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                                    | Public health check                                                                                            |
| `POST /api/auth/register`                            | `{ name, email, password, role }`; `client` or `freelancer`                                                    |
| `POST /api/auth/login`                               | `{ email, password }`; returns `{ user, token }`                                                               |
| `GET /api/auth/me`                                   | Authenticated user's public profile                                                                            |
| `GET /api/gigs?q=&category=&page=1&limit=12`         | Public available gigs; max limit 50                                                                            |
| `GET /api/gigs/:id`                                  | Public available gig                                                                                           |
| `GET /api/gigs/mine`                                 | Freelancer's own active and paused gigs                                                                        |
| `GET /api/gigs/mine/:id`                             | Freelancer's private, owned gig                                                                                |
| `POST /api/gigs`                                     | Freelancer creates a gig; 201                                                                                  |
| `PATCH /api/gigs/:id`                                | Owner updates one or more allowed fields                                                                       |
| `DELETE /api/gigs/:id`                               | Owner removes gig from the marketplace; 204                                                                    |
| `POST /api/bookings`                                 | Client sends `{ gigId }` with UUID `Idempotency-Key`; returns `{ booking, transaction }`; 201 (200 for replay) |
| `GET /api/bookings`, `GET /api/bookings/:id`         | Participant only                                                                                               |
| `GET /api/transactions`, `GET /api/transactions/:id` | Participant only                                                                                               |
| `GET /api/income`                                    | Freelancer's `{ income: { totalCents, currency, bookingCount, paymentMode } }`                                 |

Gig create/update fields:

```json
{
  "title": "I will design a thoughtful brand identity",
  "description": "A complete visual identity for your independent business.",
  "category": "design",
  "priceCents": 250050,
  "deliveryDays": 5,
  "isActive": true
}
```

Title: 5–100 characters; description: 20–2000; categories: `design`, `development`, `writing`, `marketing`, `business`; price: 100–100000000 integer cents; delivery: 1–90 days. `isActive` is optional on creation (defaults to true) and must be a JSON boolean. Currency is fixed to `ZAR`. Requests cannot set IDs, participants, currency, income, or booking status.

## Tests

Install dependencies and generate the local TLS pair with `npm ci && npm run setup` first.

```bash
# Backend integration/storage/security tests + React component/interaction tests
npm test

# Expanded Postman collection executed by Newman against isolated HTTPS API
npm run test:api

# Compile the React production bundle and check backend syntax
npm run check

# Browser workflow against the built application; run build first
npm run build
npm run test:e2e
```

Backend tests use Node's test runner and Supertest. React tests use Vitest, jsdom, Testing Library, and user-event. Tests cover both successful behavior and negative security cases: wrong roles, cross-account reads/edits/deletes, paused resources, forged/expired tokens, input injection, price/participant tampering, rate limits, concurrent retries, immutable booking amounts, and income attribution. Five additional TLS regression tests make real HTTPS requests, including a CA-signed API through Vite’s proxy, trusted extra roots, rejection of unknown issuers, and hostname checks. Component tests cover rendering, searching, registration, protected-page redirects, logout, creating a listing, simulated confirmation, retry-key reuse, safe errors, and escaped output.

The **53-request Postman collection** is [`postman/HustleHub.postman_collection.json`](postman/HustleHub.postman_collection.json). `npm run test:api` starts its own ephemeral HTTPS server, generates and trusts a dedicated local certificate, runs the actual Newman CLI, propagates its exit code, and removes its test users/data afterwards. It needs no existing running API and never modifies your normal user store. Authentication and booking limits are raised for the scenario; separate backend tests exercise actual 429 behavior at a small test limit. Never export collection run variables containing live bearer tokens.

For a manual Postman run, import the collection, set `baseUrl`, and configure the local CA/certificate trust in Postman. Use a disposable database: the collection creates random accounts and retains their simulated transactions on an independently running server. CLI equivalent from `backend/`:

```bash
npx newman run ../postman/HustleHub.postman_collection.json \
  --env-var baseUrl=https://localhost:8443 \
  --ssl-extra-ca-certs certs/cert.pem --bail
```

Playwright uses system Chromium at `/usr/bin/chromium` when present, otherwise its installed browser. If needed, run `npx playwright install --with-deps chromium`; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects another Chromium executable. Browser tests use a separate, temporary HTTPS API/data store on port 9443 and trust only the generated certificate's public-key fingerprint. They exercise registration → gig creation → client booking → both transaction views → freelancer income → listing edit/deletion, plus mobile navigation and form validation. Screenshots and failure traces go to ignored `test-results/`.

## Structure

```text
backend/
  server.js                    HTTPS entry point
  scripts/                     Local setup, certificate generation, syntax check, Newman runner
  src/
    config/                    Validated configuration and redacting logger
    middleware/                JWT/RBAC, validation, rate limits, controlled errors
    modules/auth/              Registration/login/profile and user repository
    modules/marketplace/       Gigs, bookings, transactions, income, ownership checks
    utils/jsonStore.js         Serialized atomic file persistence
    data/                      Ignored local runtime stores
  test/                        Backend integration, storage, and rate-limit tests
frontend/
  src/                         React screens, auth context, API client, styles, component tests
postman/                       Importable marketplace/security collection
tests/                        Playwright workflow and isolated HTTPS test server
```
