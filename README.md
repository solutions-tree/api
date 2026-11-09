# Multi-tenant Verification Platform

A containerized API for WhatsApp/SMS OTP verification and GSTIN lookup. Each client is isolated as a tenant with a separately revocable API key.

## Run locally

1. Copy `.env.example` to `.env` and replace both peppers with independent random values of at least 32 bytes.
2. Run `docker compose up --build -d`.
3. Create the first tenant and API key:

   ```sh
   docker compose exec api npm run seed
   ```

4. Save the displayed API key; it is shown only once.

The health endpoint is `GET http://localhost:3000/v1/health`.

## Admin interface

Open `http://localhost:3000/` and sign in with the `ADMIN_KEY` configured in `.env`. Docker Compose uses `local-admin-change-me` only as a local fallback; replace it before sharing or deploying the service.

The interface provides live usage totals, provider status, tenant and API-key creation, OTP/GST test tools, and recent audit activity. Newly created API keys are displayed once and are stored only as hashes.

## API examples

Send an OTP:

```sh
curl -X POST http://localhost:3000/v1/otp/send \
  -H 'content-type: application/json' \
  -H 'x-api-key: YOUR_API_KEY' \
  -d '{"destination":"+919876543210","channel":"WHATSAPP","purpose":"login"}'
```

Verify it:

```sh
curl -X POST http://localhost:3000/v1/otp/verify \
  -H 'content-type: application/json' \
  -H 'x-api-key: YOUR_API_KEY' \
  -d '{"requestId":"REQUEST_ID","code":"123456"}'
```

Look up GSTIN information:

```sh
curl http://localhost:3000/v1/gst/27ABCDE1234F1Z5 -H 'x-api-key: YOUR_API_KEY'
```

## Provider configuration

`PROVIDER_MODE=mock` is safe for development. The mock never prints the OTP. For Meta production delivery, use `PROVIDER_MODE=live` and configure the Meta values in `.env`. The authentication template name and language must exactly match the approved Meta template.

GST providers do not use a universal URL shape. `GstService` currently expects `GET {GST_API_BASE_URL}/taxpayer/{gstin}` with an `x-api-key` header. Adapt only that provider class to the selected GSP's official contract; the public API remains unchanged.

## Production checklist

- Put the service behind a managed load balancer and WAF; do not expose PostgreSQL or Redis.
- Store peppers and provider credentials in a cloud secrets manager.
- Run at least two API replicas across availability zones.
- Use managed PostgreSQL with point-in-time recovery and managed Redis with encryption.
- Set client-specific quotas in addition to the included default limits.
- Add the chosen SMS adapter and a background queue before high-volume delivery.
- Add provider webhooks for delivery status and signed webhook verification.
- Keep `PROVIDER_MODE=mock` in staging and never reuse production credentials.

## Current safeguards

- Tenant-scoped API authentication with hashed API keys
- Five-minute OTP expiry and five verification attempts
- Per-destination and per-tenant send limits
- HMAC-hashed OTPs and phone numbers
- Constant-time OTP and API-key comparisons
- Masked destinations, audit events, GST cache and provider timeouts
