# Starting MAX AI Studio in Codex

## Scope
Turn this proof-of-concept into a commercial, multi-user MAX AI Studio service that sells paid access by duration. Capabilities planned: code projects, documents, file export, image editing/generation and video editing/generation. Separate usage quotas / credits for expensive features. All work in Russian.

## First Codex task — audit and harden the foundation
1. Read `README_RU.md`, `AGENTS.md`, `package.json`, all `src/*` files, `sql/schema.sql` and existing tests.
2. Summarize what's implemented vs placeholder. Identify priority risks and blockers for production launch; do not claim unimplemented capabilities exist.
3. Create a ranked plan of milestones and tests in `ROADMAP.md` or update its checklist.
4. Implement ONE high-priority improvement to billing/session correctness that can be tested locally without live credentials. Add tests for it. Prefer preventing wrong customer credit, duplicated fulfillment or billing races (choose based on source audit).
5. Run `npm test` and state exactly what passed. Document how to run new tests. Do not start real payments, expose a webhook, deploy, or interact with external accounts.
6. At the end, provide a concise review in Russian: files changed, risks remaining, next task.

## Owner requirements
- Each client purchases 1, 3 or 8 hours and can purchase additional hours.
- Purchased time is on balance. A session counts down continuously only after explicit activation.
- Every client has isolated projects/files/chat history.
- Long-running AI video tasks must have their own billing and job state; charge/return credits deterministically.
- Existing unrelated MAX bots must be left untouched.

## Local workflow (Windows PowerShell)
```
npm install
npm test
```
Use local `.env` only when configuring services later. Never include any real API credentials in a prompt or a GitHub commit.
