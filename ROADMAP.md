# MAX AI Studio — roadmap (draft)

## Stage 0 — secure, testable billing foundation
- [x] Initial Node.js ESM and PostgreSQL schema
- [x] Preliminary tariffs, user balance, duration activation
- [x] Sample YooKassa payment initiation and provider verification (NOT production-ready)
- [x] Test placeholders for plan calculation
- [ ] Audit and fix monetary correctness, webhook integrity and idempotent fulfillment
- [ ] Unit/integration tests using disposable PostgreSQL and mock provider
- [ ] Full transaction ledger / invoice records / refunds / reversals
- [ ] Per-user rate limits, abuse prevention, operator logs and administrator roles

## Stage 1 — multi-user paid MAX bot
- [ ] Webhook-based MAX service with secure delivery and retry handling
- [ ] Verified purchase flow, payment reconciliation and receipts
- [ ] Activate/pause policy documented; continuous timer after activation
- [ ] Admin views of revenue/usage, cancellation and refunds
- [ ] Terms, privacy policy and local legal review before live purchases

## Stage 2 — project tools
- [ ] Per-customer isolated workspace and time-to-live policy
- [ ] File upload, virus scan, secure storage, downloads and ZIP
- [ ] DOCX / XLSX / PDF creation and parsing
- [ ] Code file generation with sandboxed builds/tests
- [ ] Metered AI provider abstraction and request logging (no secrets)

## Stage 3 — images and video
- [ ] Legal/commercial AI image provider for generation and editing
- [ ] Durable video jobs, processing/FFmpeg and storage
- [ ] Commercial AI video generation provider and cost estimate per task
- [ ] Separate credits/quotas, refunds for failed jobs, expiry decisions

## Stage 4 — scale and launch
- [ ] Deployment with HTTPS, queue/workers, monitoring and backups
- [ ] Load/security tests across many concurrent users
- [ ] Confirm payment-fiscalization, personal-data and provider-law compliance
- [ ] Gradual launch with real costs observed; adjust plan prices

No stage should be presented as launched until its acceptance tests are complete.
