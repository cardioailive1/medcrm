# MedCRM — Healthcare Management Platform

Production-oriented backend (NestJS + PostgreSQL + Prisma) for the MedCRM frontend, with
JWT authentication, role + permission RBAC, and Stripe subscription tiers. Ships with a
Render Blueprint for one-click deploy.

> ⚠️ **Compliance notice — read before using real data.**
> This is a secure-by-design **scaffold, not a HIPAA-compliant system**. Handling real
> Protected Health Information (PHI) additionally requires, at minimum: a signed Business
> Associate Agreement (BAA) with every vendor that touches PHI (Render, Stripe, your email
> provider, etc.), encryption-at-rest verification, a complete and tamper-evident audit
> trail, formal access reviews, breach-notification procedures, and a security risk
> assessment. **Do not load real patient data until your organization has completed a
> compliance review.** Stripe is **not** a PHI processor — never send PHI to Stripe.

## Stack
- **NestJS 10** (REST API, `/api` prefix) — serves the static frontend from `public/`
- **PostgreSQL** via **Prisma** ORM (migrations + seed)
- **Auth:** email/password (Argon2id), JWT access tokens + opaque, hashed, **rotating** refresh tokens
- **RBAC:** roles (`ADMIN`, `PHYSICIAN`, `NURSE`, `STAFF`, `BILLING`) → permissions, enforced by global guards
- **Billing:** Stripe Checkout + Customer Portal + webhooks → tier gating (`FREE`/`PRO`/`ENTERPRISE`)
- **Hardening:** Helmet, CORS allowlist, global validation (whitelist), rate limiting, audit logging

## Local setup
```bash
cp .env.example .env          # fill in secrets
npm install
npx prisma migrate dev        # creates tables
npm run prisma:seed           # demo org + users (admin@citymedical.org / ChangeMe123!)
npm run start:dev
# Frontend: http://localhost:3000/    API: http://localhost:3000/api    Health: /health
```

## Auth flow
| Method | Route | Notes |
|---|---|---|
| POST | `/api/auth/register` | Creates an organization; first user becomes `ADMIN`. Returns tokens. |
| POST | `/api/auth/login` | Returns `{ accessToken, refreshToken }`. |
| POST | `/api/auth/refresh` | Rotates the refresh token (old one is revoked). |
| POST | `/api/auth/logout` | Revokes the presented refresh token. |
| GET  | `/api/auth/me` | Current user + permissions + org/tier. |

Send the access token as `Authorization: Bearer <token>`. Every route requires auth unless
marked `@Public()`.

## RBAC
Role → permission mapping lives in `src/common/enums/permission.enum.ts` (single source of truth).
Protect routes declaratively:
```ts
@RequirePermissions(Permission.PATIENT_CREATE)   // permission check
@Roles(Role.ADMIN)                               // or a coarse role check
```

## Subscription tiers
Gate features by minimum tier; the `SubscriptionGuard` verifies the org's tier **and** an active
subscription status:
```ts
@MinTier(Tier.PRO)
@Get('stats')   // e.g. GET /api/patients/stats requires PRO
```
Billing endpoints: `POST /api/billing/checkout`, `POST /api/billing/portal`,
`GET /api/billing/plans`, and the public `POST /api/billing/webhook`.

### Stripe setup
1. Create two recurring Prices (PRO, ENTERPRISE); put their IDs in `STRIPE_PRICE_PRO` / `STRIPE_PRICE_ENTERPRISE`.
2. Add a webhook endpoint → `https://<your-app>/api/billing/webhook`, subscribe to
   `checkout.session.completed` and `customer.subscription.*`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.
3. The webhook keeps each org's `tier` / `subscriptionStatus` in sync automatically.

## Deploy to Render
1. Push this folder to a Git repo.
2. Render → **New + → Blueprint** → select the repo. `render.yaml` provisions the Postgres
   database and the web service, runs `prisma migrate deploy` on build, and generates JWT secrets.
3. In the dashboard, set the `sync: false` vars: `STRIPE_*`, `APP_URL` (your Render URL),
   `CORS_ORIGINS`.
4. Point your Stripe webhook at `https://<your-app>/api/billing/webhook`.

A `Dockerfile` is included if you prefer a Docker service over the native Node runtime.

## Project layout
```
src/
  auth/        register/login/refresh/logout, JWT strategy, rotation
  users/       org-scoped user management (permission-gated)
  patients/    patient CRUD + PRO-gated /stats
  billing/     Stripe checkout, portal, webhook, tier sync
  common/      enums (roles/permissions/tiers), decorators, guards, audit interceptor
  prisma/      Prisma service/module
prisma/        schema.prisma, seed.ts
public/        served frontend (index.html)
render.yaml    Render Blueprint
```

## Domain modules & endpoints (v2)
All routes are under `/api`, require a Bearer token, and are org-scoped + permission-checked. Tier gates noted.

| Module | Endpoints | Tier |
|---|---|---|
| Appointments | `GET /appointments` (`?from&to`), `POST /appointments` | FREE |
| Telehealth | `GET /telehealth`, `GET /telehealth/queue`, `POST /telehealth` | PRO |
| Care pipeline | `GET /pipeline`, `POST /pipeline` | FREE |
| Messages | `GET /messages`, `POST /messages`, `PATCH /messages/:id/read` | FREE |
| AI agents (activity) | `GET /agents/activity`, `POST /agents/activity` | PRO |
| Workflows | `GET /workflows/:board` (clinical\|nursing\|physician), `POST /workflows` | FREE |
| Surveys (CSAT) | `GET /surveys`, `GET /surveys/summary`, `POST /surveys` | PRO |
| CMS measures | `GET /cms`, `POST /cms` | ENTERPRISE |
| Interop | `GET /interop/status`, `GET /interop` (`?kind`), `POST /interop` | ENTERPRISE |
| Analytics | `GET /analytics/overview` | PRO |

The seeded demo org is on the **ENTERPRISE** tier, so every page has data after `npm run prisma:seed`.
Downgrading the org's tier (or hitting these as a FREE/PRO org) returns `403`, which the
frontend renders as an "upgrade required" empty state — this is the subscription gating working.

> **Interop is a representational store, not a live integration.** The `InteropResource`
> model persists FHIR/HL7/PACS *records*; it does not connect to a real EHR, lab interface,
> or imaging archive. Wiring those requires actual interface engines, MLLP listeners, and a
> DICOM/DICOMweb server, plus the compliance work noted above.

## Run order (with the new models)
```bash
cp .env.example .env
npm install
npx prisma migrate dev --name domain   # creates the new tables
npm run prisma:seed
npm run start:dev
```

## Agent modules (Administrative Task Agent + Reporting Agent)
| Module | Endpoints | Tier |
|---|---|---|
| Admin agent | `GET /admin/summary`, `GET/POST /admin/tasks`, `GET/POST /admin/automations`, `PATCH /admin/automations/:id`, `GET/POST /admin/compliance` | PRO |
| Reporting agent | `GET /reports/summary`, `GET/POST /reports/scheduled`, `GET/POST /reports/insights` | PRO |

The frontend now uses **modal forms** (not prompts) for create/edit: Add/Edit Patient,
Invite/Edit Staff, New Appointment, Add Pipeline Entry, New Admin Task, Schedule Report.
Automation toggles on the Admin page PATCH the backend live.

## Security & account creation
- **Sign in + create account** are both in the app's auth overlay (toggle at the top).
  Account creation spins up a new organization with the first user as ADMIN.
- **Password policy:** 12+ chars with upper/lower/number/symbol (live strength meter on the form).
- **Brute-force lockout:** 5 failed attempts locks the account for 15 minutes; sign-in is also
  per-IP rate limited.
- **Audit trail:** every auth event (login success/failure, lockout, account creation, logout)
  is written to `AuditLog` with IP.
- **Automatic logoff** after 15 minutes of inactivity (client-side idle timer).
- **Transmission security:** HSTS + `no-referrer` via helmet; short-lived access tokens with
  rotating refresh tokens.

**Compliance:** see [`COMPLIANCE.md`](./COMPLIANCE.md). This scaffold is **not** certified
HIPAA/SOC 2/Part 11 and must not hold real PHI until the organizational gaps listed there
(BAAs, encryption at rest, risk analysis, audits, MFA) are closed. FDA generally does not
apply to a CRM; the relevant records rule is 21 CFR Part 11 (audit trails implemented;
e-signatures not).

## Automation layer (real, rules-based — not LLM)
`@nestjs/schedule` job runner in `src/jobs/`:
- Every 30 min: runs each org's **active automations** (increments `runs`, stamps `lastRunAt`,
  writes an `AgentActivity` entry, prunes activity to 200/org).
- Every hour: **generates insights** computed from live data (no-show rate, telehealth share,
  at-risk count) and refreshes the `[auto] …` insight set.
- On-demand triggers: `POST /api/jobs/run-automations`, `POST /api/jobs/generate-insights`
  (ORG_MANAGE, PRO) so you can exercise it without waiting for cron.
- Toggle with `JOBS_ENABLED=false`.

## API docs (Swagger)
Interactive OpenAPI docs at **`/api/docs`** (bearer-auth aware). Served by `@nestjs/swagger`.

## Tests
Starter Jest suite (`npm test`): RBAC permission map + tier ordering
(`permission.enum.spec.ts`), org-scoping (`patients.service.spec.ts`), and the insight
generator (`jobs.service.spec.ts`, mocked Prisma).

## Full run order (all migrations)
```bash
cp .env.example .env
npm install
npx prisma migrate dev --name full         # patients, domain, agents, auth-hardening
npm run prisma:seed
npm run start:dev     # API + app at http://localhost:3000 · docs at /api/docs
npm test              # run the unit suite
```

## Pricing & plans
- `GET /api/billing/plans` returns the tier catalog with per-provider pricing (Pro $79/mo,
  Enterprise from $300/mo custom), annual discount, and feature lists. Frontend renders a
  **Plans & Billing** modal (Settings → Integrations → "Subscription & Plans") with working
  **Upgrade** (Stripe Checkout) and **Manage billing** (Stripe Portal) actions.
- Pricing rationale + a live **Excel pricing model** (`medcrm_pricing_model.xlsx`) accompany
  this: edit cost-to-serve, margin, seats, and churn to back-solve prices and see MRR/ARR and
  unit economics. Numbers are market-derived reference points — validate before launch.

## Stripe Payment Links (alternative to API checkout)
The app supports **both** billing paths:
- **Payment Links** (simplest): set `STRIPE_PAYMENT_LINK_PRO` / `STRIPE_PAYMENT_LINK_ENTERPRISE`.
  The upgrade buttons redirect to the link with `?client_reference_id=<orgId>__<TIER>` so the
  webhook can map the purchase back to the organization.
- **Checkout Sessions API**: set `STRIPE_PRICE_PRO` / `STRIPE_PRICE_ENTERPRISE` (per-seat capable).

**Required for either path:** create a webhook endpoint at `{APP_URL}/api/billing/webhook`,
subscribe to `checkout.session.completed` and `customer.subscription.{updated,deleted}`, and set
`STRIPE_WEBHOOK_SECRET`. `checkout.session.completed` is what flips the org's tier to ACTIVE after
a Payment Link purchase.
