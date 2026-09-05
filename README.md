# HustleHub+ — Secure Freelance Marketplace

> **Status: Part 1 — Secure Foundations.** This README covers what Part 1 delivers
> (registration, login, JWT-protected routes, HTTPS, and the security controls
> around them).

## 1. What HustleHub+ is

HustleHub+ is a freelance marketplace. **Freelancers** advertise services
as knoes as gigs; **Clients** browse and book them. Bookings generate simulated
financial transactions, which feed into an income tracker and an estimated
tax calculation for Freelancers, shown on a personal dashboard. A third role,
**Admin**, oversees the platform.

Because the platform touches credentials, payments, and income data, security
is treated as a core requirement, not something bolted on afterwards — every
design choice in this document is made with that in mind.

### Intended users

| Role           | What they do on the platform                                                    |
| -------------- | ------------------------------------------------------------------------------- |
| **Client**     | Registers, browses gigs, books a Freelancer's services.                         |
| **Freelancer** | Registers, lists/manages gigs, receives bookings, views income & estimated tax. |
| **Admin**      | Oversees users and platform activity. Not self-service                          |

Part 1 implements registration and login for **Client** and **Freelancer**
accounts. Gigs, bookings, transactions, income tracking and the dashboard are
planned for Part 2 and Part 3 ((#8-roadmap--whats-deferred)).

## 2. Architecture

HustleHub+ follows the MERN stack (MongoDB, Express, React, Node.js).

### Repository structure

```
hustlehub-plus/
├── README.md                        <- this file
└── backend/
    ├── server.js                    <- HTTPS entry point
    ├── package.json
    ├── certs/                       <- key.pem / cert.pem
    └── src/
        ├── app.js                   <- Express app: middleware stack + routes
        ├── config/
        │   ├── env.js                <- loads & validates all configuration
        │   └── logger.js             <- Winston logger (redacts secrets)
        ├── middleware/
        │   ├── auth.middleware.js         <- JWT authenticate() / authorize()
        │   ├── rateLimiter.middleware.js  <- brute-force throttling
        │   ├── errorHandler.middleware.js <- centralised, leak-free error responses
        │   └── notFound.middleware.js
        ├── modules/
        │   └── auth/
        │       ├── auth.routes.js       <- POST /register, /login, GET /me
        │       ├── auth.controller.js   <- HTTP layer only
        │       ├── auth.service.js      <- business logic (hash, verify, sign JWT)
        │       ├── auth.validation.js   <- express-validator rules
        │       └── user.repository.js   <- file-backed persistence
        ├── utils/
        │   ├── ApiError.js
        │   ├── asyncHandler.js
        │   ├── jwt.js
        │   └── password.js
        └── data/
            └── users.json            <- created at runtime
```

This is organised in layers (routes → validation → controller → service →
repository) so each concern is testable and replaceable in isolation.

## 3. Getting started

### Prerequisites

- Node.js 18+ and npm
- OpenSSL (used to generate a local TLS certificate; preinstalled on
  macOS/Linux, available via Git Bash or WSL on Windows)

### Setup

```bash
cd backend
npm install

# Create your local environment file and edit the values (at minimum,
# set a real JWT_SECRET — see the comment in the file for how)
cp .env.example .env

# Generate a local self-signed TLS certificate (one-time)
npm run certs
```

### Run

```bash
npm run dev     # auto-restarts on file changes (nodemon)
# or
npm start
```

The API starts on `https://localhost:8443` (or whatever `PORT` you set).
Because the certificate is self-signed, your browser or `curl` will warn
that it isn't trusted — that's expected for local development (see
[HTTPS](#https-transport-security) below). With `curl`, use `-k` to skip
certificate verification for local testing only.

## 4. API reference

All request/response bodies are JSON. All responses (success and error) use
`application/json`.

### `POST /api/auth/register`

| Field      | Rules                                                                            |
| ---------- | -------------------------------------------------------------------------------- |
| `name`     | required, ≤100 chars                                                             |
| `email`    | required, valid email, normalised (lowercased)                                   |
| `password` | 10–128 chars, must include an uppercase letter, a lowercase letter, and a number |
| `role`     | `"client"` or `"freelancer"` only — see [Roles & access](#roles--access)         |

```bash
curl -k -X POST https://localhost:8443/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","password":"Str0ngPassw0rd","role":"freelancer"}'
```

**201 Created**

```json
{
  "user": {
    "id": "...",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "role": "freelancer",
    "createdAt": "..."
  },
  "token": "eyJhbGciOi..."
}
```

### `POST /api/auth/login`

```bash
curl -k -X POST https://localhost:8443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"Str0ngPassw0rd"}'
```

**200 OK** — same shape as register. **401** with `{"error":{"message":"Invalid email or password"}}`
for either a wrong email or a wrong password (see [why](#account-enumeration)).

### `GET /api/auth/me` (protected)

Requires the token from register/login as a bearer token:

```bash
curl -k https://localhost:8443/api/auth/me \
  -H "Authorization: Bearer <token>"
```

**200 OK**: `{ "user": { ... } }`. **401** if the header is missing, malformed,
or the token is invalid/expired.

### `GET /api/health`

Unauthenticated liveness check: `{ "status": "ok" }`. Intended for container
orchestration probes in Part 2/3.

### Error shape

Every error response has the same shape, so clients can handle them
uniformly:

```json
{
  "error": {
    "message": "...",
    "details": [{ "field": "email", "message": "..." }]
  }
}
```

`details` is only present for validation failures (400s) and never contains
anything beyond the field name and a human-readable message.

## 5. Roles & access

Three roles are defined: `client`, `freelancer`, `admin`. **Public
registration only allows `client` or `freelancer`** — there is no request
parameter or combination of inputs that results in an `admin` account, by
design. Admin accounts are expected to be provisioned directly in the data
store (or, in Part 2+, via a separate seeded/administrative process) rather
than through the public API. This closes off the most common real-world
privilege-escalation bug in marketplace apps: a registration endpoint that
naively trusts a client-supplied role.

Part 1 ships one protected route (`GET /api/auth/me`) to prove the JWT
middleware works end-to-end. The `authorize(...roles)` middleware
(`src/middleware/auth.middleware.js`) is already written and ready to be
attached to Part 2's gig/booking routes to enforce, e.g., "only freelancers
can create gigs" or "only the booking's client or the assigned freelancer can
view its transaction".

## 6. Security decisions

Each item below maps directly to a Part 1 requirement.

### Password storage

Passwords are hashed with **bcrypt** (`src/utils/password.js`), cost factor
12 by default. bcrypt was chosen over a fast hash (SHA-256, MD5) because it
is deliberately slow and salts automatically per-password, making offline
brute-force/rainbow-table attacks impractical even if the user store leaked.
**Plain-text passwords are never logged, stored, or returned in any
response** — the repository only ever persists `passwordHash`, and the
service layer's `toPublicUser()` projection strips it before a user object
reaches a controller.

### JWT-based authentication

On successful login/registration, the API signs a JWT (`src/utils/jwt.js`,
HS256) containing only `sub` (user id) and `role` — no name/email, since JWT
payloads are base64-encoded, not encrypted, and readable by anyone holding
the token. Tokens are short-lived (`JWT_EXPIRES_IN`, default 1 hour) and
carry an `issuer` claim, both enforced on verification. `authenticate`
middleware (`src/middleware/auth.middleware.js`) validates the token
(signature, expiry, issuer) on every request to a protected route via a
`Bearer` Authorization header; failures return a generic 401 without
revealing _why_ verification failed (that detail is logged server-side only).

### HTTPS transport security

`server.js` starts the API with Node's built-in `https` module using a
locally generated certificate (`scripts/generate-certs.sh` → OpenSSL,
self-signed, 365-day, `CN=localhost`). There is **no HTTP fallback**: if the
certificate/key files are missing, the process refuses to start with an
explicit message rather than silently serving plain HTTP. In a real
deployment, this self-signed cert would be replaced by one from a trusted CA
(e.g. Let's Encrypt) or TLS would be terminated at a reverse proxy/load
balancer in front of the API.

### Input validation & sanitisation

Every field on `/register` and `/login` is validated **and** sanitised with
`express-validator` (`src/modules/auth/auth.validation.js`) before it
reaches business logic: trimming, HTML-escaping the name, normalising and
format-checking email, enforcing a password length/complexity policy, and
restricting `role` to an explicit allow-list. Validation failures short-
circuit with a 400 and field-level (but internals-free) messages. The
controller also **only ever destructures the exact fields it expects**
(`const { name, email, password, role } = req.body`) as a second line of
defence against mass-assignment style bugs, even though validation has
already run.

### Controlled error responses

A single centralised error handler (`src/middleware/errorHandler.middleware.js`)
is the _only_ place HTTP error responses are built. Known, expected failures
(`ApiError` instances — bad input, wrong credentials, not found, etc.) return
their authored, safe message. Anything else — a bug, an unexpected exception,
a third-party library throwing — is logged in full server-side (message +
stack trace) but the client only ever receives `"Internal server error"`.
Stack traces, file paths, and config values are never serialised into a
response, in any code path, including ones a future contributor forgets to
wrap in a try/catch (the `asyncHandler` wrapper forwards those errors to the
same handler).

### Defence in depth (supporting controls)

- **Rate limiting** on `/register` and `/login` (`express-rate-limit`) slows
  brute-force and credential-stuffing attempts.
- **Helmet** sets a solid baseline of security response headers (HSTS,
  `X-Content-Type-Options`, etc.), and the `X-Powered-By` header is disabled.
- **CORS** is restricted to an explicit allow-list of origins (the future
  React app) rather than `*`, since the API issues bearer tokens intended for
  a specific trusted client.
- **Body size limits** (10kb) reduce the impact of large-payload abuse.
- <a id="account-enumeration"></a>**Account enumeration mitigation**: login
  returns the identical error and status code whether the email doesn't
  exist or the password is wrong, so an attacker can't use the API to build
  a list of valid registered emails.
- **Secrets management**: all configuration is loaded through one module
  (`src/config/env.js`) which fails fast at startup if a required secret is
  missing, too short, or left as the example placeholder. `.env` is
  gitignored; only `.env.example` (no real values) is committed.
- **Structured logging**: key events (registration, successful/failed
  login, rejected requests, unhandled errors) are logged via Winston with a
  redaction step that strips passwords/tokens/Authorization headers from any
  logged object before it's written out, so secrets can't end up in log
  files even by accident.
- **Data-at-rest note (Part 1 scope)**: the local JSON store is written with
  restrictive file permissions (`0o600`) and is gitignored; it holds
  password hashes only, never plain-text passwords.
