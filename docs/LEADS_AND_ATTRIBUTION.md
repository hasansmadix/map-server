# Leads API & attribution

## Public

`POST /api/v1/leads` — create enquiry (no auth). Idempotent on `submissionId`.

Spam controls:

- Cloudflare Turnstile
- Honeypot field `company` (must be empty)
- Dedicated IP sliding-window rate limit (not the auth progressive ladder)

Response: `{ publicId, submissionId, createdAt }` only.

### Contact lead rate limit (`CONTACT_LEAD`)

Applied only when creating a **new** lead (idempotent replays with the same `submissionId` + matching email do **not** consume quota).

| Window | Limit | Redis key prefix |
|--------|-------|------------------|
| Burst | **5** submissions / **10 minutes** / IP | `rate:contact:lead:burst:{ip}` |
| Daily | **20** submissions / **24 hours** / IP | `rate:contact:lead:daily:{ip}` |

Both windows are checked atomically (single Redis `EVAL`). Exceeding either returns **HTTP 429** with:

- JSON body `{ statusCode, message, retryAfter, ... }`
- Response header `Retry-After: <seconds>`

Client IP comes from Express `trust proxy` (`req.ip`), with `X-Forwarded-For` first hop as fallback.

Auth endpoints continue to use the separate progressive-cooldown `RateLimiterService` unchanged.

### Idempotency

- Same `submissionId` + same email → return existing public payload, no new row, no rate-limit consume.
- Same `submissionId` + different email → `409 Conflict` (`Invalid submission`) without exposing the other lead.

## Admin

- `GET /api/v1/admin/leads` — paginated list + search/filters
- `GET /api/v1/admin/leads/:id` — full detail including attribution JSONB

Roles: `superadmin`, `admin` only.

## Notifications

Rows land in `lead_notification_outbox`. Cron (`@nestjs/schedule`, every minute) sends via Resend with bounded backoff. Lead create never waits on email.

## Migrations

```bash
pnpm run migration:run
```

Migration: `1767800000000-CreateLeadsTables.ts`

## Tests

```bash
pnpm test -- sliding-window-rate-limiter
pnpm test -- contact-lead-rate-limit
pnpm test -- leads.service.idempotency
```
