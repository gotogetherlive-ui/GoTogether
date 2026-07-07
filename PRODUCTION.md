# GoTogether Production Checklist

## Payment Architecture

GoTogether now separates payment collection modes explicitly:

- `PAYMENT_MODE=ORGANIZER_OWNED`: customers pay the trip organizer directly through that organizer's configured gateway account. This is the required direct organizer gateway model.
- `PAYMENT_MODE=PLATFORM_CONTROLLED`: customers pay GoTogether/platform-owned gateway credentials. Organizer receivables and payouts are handled internally.
- `PAYMENT_MODE=MARKETPLACE`: customers pay through a supported connected-account/transfer model.

Do not use `ORGANIZER_OWNED` for platform-owned collection. In `ORGANIZER_OWNED`, checkout must be blocked unless the trip creator has an active verified provider account with encrypted API key and API secret, plus a separate webhook secret only for gateways that issue one, such as Razorpay.

## Required Environment

Use `.env.production.example` as the deployment template. Never commit real values.

Required for every production deployment:

- `DATABASE_URL`: PostgreSQL connection string. Use SSL for managed databases, for example `?sslmode=require` or `PGSSLMODE=require`.
- `NEXT_PUBLIC_BASE_URL` and `NEXT_PUBLIC_APP_URL`: the same public `https://` origin for payment callbacks, OAuth callbacks, and browser redirects.
- `SUPER_ADMIN_EMAIL`: initial super-admin identity. Add the same normalized email to `admin_accounts`.
- `CRON_SECRET`: long random secret sent as `Authorization: Bearer ...` to cron routes.
- `PAYMENTS_MASTER_KEY`: long random key used to encrypt stored organizer payment credentials. Do not rely on the development fallback.
- `PAYMENT_MODE=ORGANIZER_OWNED`, `PLATFORM_CONTROLLED`, or `MARKETPLACE`.
- `ENABLED_ORGANIZER_PAYMENT_PROVIDERS` and `NEXT_PUBLIC_ENABLED_ORGANIZER_PAYMENT_PROVIDERS`: matching comma-separated provider list, for example `RAZORPAY,CASHFREE`.
- `PAYMENT_PROVIDER`: required only for `PLATFORM_CONTROLLED`, where platform credentials select the default checkout gateway.
- Cloudinary, Google OAuth, and Resend credentials.
- `TRUST_PROXY=true` only when the app is behind a trusted proxy that overwrites forwarding headers.
- `PG_POOL_MAX` and `WEB_CONCURRENCY` sized for the database connection limit.

Recommended for rolling or multi-instance deployments:

- `NEXT_DEPLOYMENT_ID` or `DEPLOYMENT_VERSION`: stable release id, usually a git SHA.
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`: shared base64 key for Server Functions across all instances.

## Payment Providers

The payment domain supports Razorpay and Cashfree through provider adapters. A provider should be enabled only after one low-value staging payment, webhook confirmation, failure callback, cancellation, refund, and reconciliation test has passed.

Mode-specific requirements:

- `ORGANIZER_OWNED`: each organizer with paid live trips must have an active verified `payments.provider_accounts` row for the trip organizer. The row must include encrypted API key and API secret, plus a separate webhook secret only for gateways that issue one, such as Razorpay. `payments.orders.provider_account_id` is required.
- `PLATFORM_CONTROLLED`: platform gateway env vars are required for every enabled platform provider. `payments.orders.provider_account_id` may be null.
- `MARKETPLACE`: linked account/transfer support must be enabled and verified before live traffic.

Webhook confirmation is the source of truth. Frontend checkout acknowledgement only moves bookings to processing; bookings become confirmed after verified gateway success events are processed. Failed, ignored, duplicate, and refund webhooks are logged idempotently in `payments.webhook_logs` and `payments.payment_events`.

## Payment Routing Matrix

| Mode | Credential Source | `provider_account_id` Required? | Who Receives Payment? | Checkout Blocker |
| --- | --- | --- | --- | --- |
| `PLATFORM_CONTROLLED` | Platform env credentials | No | GoTogether platform | Missing platform credentials |
| `ORGANIZER_OWNED` | Trip organizer's encrypted provider account | Yes | Trip organizer | Missing/incomplete organizer provider account |
| `MARKETPLACE` | Connected/linked provider account | Yes | Provider marketplace transfer rules | Missing linked account or marketplace flags |

## Security Model

- Payment order creation loads the trip server-side and derives `organizer_id` from the trip row.
- Frontend payloads are not trusted for organizer ID, provider account ID, amount, currency, or gateway credentials.
- Organizer-owned checkout verifies the selected provider account belongs to the trip organizer.
- Unsafe API requests are same-origin checked by `src/proxy.ts`; payment webhooks are exempt from same-origin checks and authenticated with provider signatures instead.
- Payment confirmation is amount checked, idempotent, transactionally locked, and capacity serialized per trip.
- Cron endpoints require `CRON_SECRET`. Do not expose them through an unauthenticated scheduler.
- CSP allows only the app, maps, image providers, and configured payment gateway hosts.

## Deployment

1. Use TLS at the platform edge or load balancer. Do not run production payment callbacks over plain HTTP.
2. Restrict PostgreSQL and management interfaces to private networks.
3. Run all SQL migrations in `db/migrations` before deploying code that depends on them.
4. Configure provider webhook/callback URLs using the exact public origin in `NEXT_PUBLIC_BASE_URL`.
5. Run `npm ci`, then `npm run release:check` with production environment variables present.
6. Start with `NODE_ENV=production npm start` for platform-managed scaling, or `NODE_ENV=production npm run start:cluster` on a single multi-core VM.
7. Schedule booking expiry, story expiry, refund retry, and reconciliation cron routes with the bearer secret.
8. Back up PostgreSQL, test restores, and alert on failed refunds, webhook 5xx responses, database saturation, and repeated authentication failures.

## Payment Readiness Classification

- Production Certified: requires official sandbox or live artifacts for organizer-owned order creation, checkout success, verified webhook, failure handling, refund handling, booking consistency, and reconciliation across at least two organizers.
- Sandbox Verified: requires successful official sandbox payment, webhook, refund, and booking consistency tests against organizer-owned credentials.
- Implementation Complete / Sandbox Ready: code supports organizer-owned routing and tests pass, but official sandbox/live artifacts are not present.
- Not Ready: missing secure gateway config, webhook verification, idempotency, booking-payment consistency, refund handling, organizer provider account tracking, or reconciliation.
- Blocked: external organizer gateway credentials, webhook endpoint exposure, production domain, or provider dashboard access is unavailable.

## Release Gate

Run before every deployment:

```bash
npm ci
npm audit --omit=dev --audit-level=moderate
npm run release:check
```

`npm run release:check` runs:

```bash
node scripts/check-production-env.mjs
npm run lint
npm run typecheck
npm run build
```

The release gate confirms configuration shape and build health. It does not replace staging tests for OAuth, email delivery, Cloudinary uploads, each enabled payment provider, refunds, cron authentication, or database migration rollback/restore.
