# MedCRM — Compliance Posture

> **Read this first.** MedCRM is **not** a certified or compliant system. Compliance
> (HIPAA, SOC 2, 21 CFR Part 11) is an *organizational and legal* state — signed
> agreements, audits, policies, training, and operational evidence — that software
> alone cannot provide. What the code does is implement the **technical safeguards**
> those frameworks require, so the organization deploying it has a defensible starting
> point. Do **not** store real Protected Health Information (PHI) until the
> "Organizational gaps" below are closed with your compliance and legal teams.

## What the code implements (technical safeguards)

| Control (in code) | Where | Maps to |
|---|---|---|
| Unique user identification | `User.email` unique; per-user JWT `sub` | HIPAA §164.312(a)(2)(i) |
| Password hashing (Argon2id) | `auth.service.ts` | HIPAA §164.312(a)(2); NIST 800-63B |
| Strong password policy (12+, complexity) | `register.dto.ts` + client meter | NIST 800-63B; HIPAA §164.308(a)(5) |
| Brute-force lockout (5 fails → 15 min) | `auth.service.ts` (`failedLoginCount`, `lockedUntil`) | HIPAA §164.308(a)(6) |
| Per-IP sign-in rate limiting | `@Throttle` on `/auth/login` | SOC 2 CC6.6 |
| Audit trail of auth events | `AuditLog` writes: login success/failure, lockout, register, logout | HIPAA §164.312(b); **21 CFR Part 11 §11.10(e)** |
| Automatic session logoff (15 min idle) | client idle timer | HIPAA §164.312(a)(2)(iii) |
| Short-lived access tokens + rotating refresh | `issueSession`, `/auth/refresh` | SOC 2 CC6.1 |
| Role-Based Access Control (least privilege) | `RolesGuard`/`PermissionsGuard`, `ROLE_PERMISSIONS` | HIPAA §164.312(a)(1); SOC 2 CC6.3 |
| Org-scoped data isolation | every query filters `organizationId` | HIPAA §164.308(a)(4) |
| Transmission security headers (HSTS, no-referrer) | `main.ts` helmet | HIPAA §164.312(e) |
| Explicit consent captured + audited at signup | `acceptedTerms` + `ACCOUNT_CREATED` audit | Part 11 §11.10; SOC 2 CC2 |
| Input validation / whitelisting | global `ValidationPipe` | SOC 2 CC7 |

## On "FDA compliant"
A general-purpose CRM is typically **not** an FDA-regulated medical device. FDA rules
apply to Software as a Medical Device (diagnosis/treatment claims). The framework most
relevant to *records* here is **21 CFR Part 11** (electronic records & signatures). This
codebase implements Part 11-aligned **audit trails**; it does **not** implement Part 11
**electronic signatures** (§11.50/§11.70/§11.200) — signed-record meaning, signature
manifestations, and signature/record linking — which require a dedicated e-signature flow.
If your product makes clinical claims, an FDA regulatory assessment (device classification,
possible 510(k)/De Novo, Part 820 QSR) is required and is out of scope for code.

## Organizational gaps the code CANNOT close
- **Business Associate Agreements (BAAs)** with every vendor touching PHI: your cloud host
  (e.g., a HIPAA-eligible plan), database host, email/SMS, error monitoring, analytics, CDN.
  Render's standard plans are not, by default, covered by a BAA — confirm before storing PHI.
- **Encryption at rest** for the database and backups (verify your DB host enables it) and
  key management. TLS in transit must be terminated correctly end-to-end.
- **Risk analysis & risk management** (§164.308(a)(1)), **contingency/backup & disaster
  recovery**, **workforce security & training**, **sanction policy**, **incident response
  and breach notification** procedures.
- **SOC 2**: a Type II report is issued by a licensed CPA firm after observing your controls
  over a 3–12 month window. You need documented policies, change management, vendor
  management, monitoring/alerting, and collected evidence — then an auditor.
- **Part 11 e-signatures**, records retention/immutability guarantees, and validation
  documentation (IQ/OQ/PQ) if you are in an FDA-regulated context.
- **Audit log immutability**: current logs live in the same DB. For tamper-evidence, ship
  them to append-only/WORM storage with integrity checks.
- **MFA**: strongly recommended (and increasingly expected). Not yet implemented — see below.

## Recommended next controls
1. **MFA / TOTP** at sign-in (e.g., `otplib`) with enrollment + recovery codes.
2. **Forced password rotation / breach-password check** (HIBP k-anonymity API).
3. **Field-level encryption** for the most sensitive PHI columns.
4. **Ship audit logs** to immutable storage; add integrity hashing/chaining.
5. **Part 11 e-signature** module if regulated records are signed in-app.

Treat this document as a checklist to work through with qualified compliance counsel —
not as evidence of compliance.
