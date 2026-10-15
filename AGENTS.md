# Codex project instructions — MAX AI Studio

## Product
Commercial Russian-language AI assistant in MAX messenger with paid time-based access. Each customer's account, access time, usage, projects and files must be isolated from other customers. Plans are currently illustrative: 1h / 199 RUB, 3h / 499 RUB, 8h / 990 RUB. They are NOT approved prices. Images and videos require separate metering/credits; access hours are not an unlimited AI allowance.

## Current status
This is a proof-of-concept, **not safe for commercial production**. Existing files implement preliminary MAX long-polling bot, PostgreSQL schema, account and activation logic, payment initiation/verification skeleton, and optional GigaChat text answers. Image/video/document processing, production MAX webhook, robust accounting, and project storage are not implemented.

## Environment and commands
- Node.js >=22, ECMAScript modules; PostgreSQL database.
- `npm install` to install dependencies, `npm test` for tests, `npm start` for local demo (requires `.env` and a separate MAX bot token and DB).
- Copy `.env.example` to `.env`. NEVER commit `.env`, credentials, access tokens, customer media, or payment secrets.
- In production choose providers legally available in served markets. Do not assume ChatGPT Plus subscriptions are usable as API access.

## Development practices
1. Communicate with the owner in Russian. Explain major edits and any commands requiring secrets, remote operations or production payments.
2. Inspect actual source and tests before making assumptions. Make incremental changes; run tests after edits; report exactly what was tested and what was not.
3. Work only in this project's directory. Do NOT change any existing bots in other Windows folders.
4. Always default to mock/test providers and disabled real payments. Do not activate payment processing, charge customers, deploy to a public server, or send external requests with real credentials without explicit owner approval.
5. Database changes require explicit SQL migration, tests and rollback notes. Never silently drop existing customer data.
6. Security priorities: verify MAX user identity on server; verify payment provider state server-side; idempotent payment crediting; atomic quota and balance operations; guard webhook endpoints; rate limits; safe filenames and file-size limits; sandbox untrusted code; malware scanning; isolate user storage; lifecycle of files and personal data.
7. User-visible prices, supported operations, provider restrictions, and timers must be accurate. Preserve the rules that time starts only after user activation and then runs continuously; protect against double activation, retries and races.
8. Long-running tasks must use a durable queue and appropriate charging/reservation; don't equate successful enqueue with a generated result. Define how jobs crossing session expiry and failed jobs are handled.
9. Avoid giant unreviewed rewrites. Add unit and integration tests around payment verification, duration, concurrency, expiration and authorization before expanding media capabilities.
10. Before production, require separate reviews of Russian regulatory compliance (54-FZ fiscalization including advances/refunds, 152-FZ personal data, terms of service), commercial contracts, monitoring and disaster recovery.

## First assignment
Read `CODEX_START.md`, perform the architecture/security audit described there and implement ONLY the first incremental improvement with tests. Do not switch on real payments or use real tokens.
