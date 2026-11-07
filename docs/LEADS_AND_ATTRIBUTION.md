# Leads API & attribution

## Public

`POST /api/v1/leads` — create enquiry (no auth). Idempotent on `submissionId`.

Spam controls: Cloudflare Turnstile, honeypot (`company`), IP rate limit (`RateLimitKey.CONTACT_LEAD`).

Response: `{ publicId, submissionId, createdAt }` only.

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
