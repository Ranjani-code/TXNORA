# TXNORA — Every transaction, traceable.

An evidence-linked transaction consistency and PayPal invoice workflow for freelancers and small exporters. React + TypeScript + Vite frontend, Express API, SQLite persistence (WASM SQLite; no separate SQLite installation), Gemini analysis, and PayPal REST Sandbox integration.

## Requirements
- Node.js 20.19+ or 22.12+ (Vite 8 requirement)
- Internet access during the first `npm.cmd install`
- Gemini API key (AI analysis)
- PayPal Developer Sandbox REST app Client ID and Secret (invoice workflow)

## Windows setup (PowerShell)
1. Extract this ZIP and open the extracted `TXNORA` folder in VS Code.
2. Open Terminal → PowerShell. Confirm you are in the folder containing `package.json`.
3. Install dependencies: `npm.cmd install`
4. Copy `.env.example` to `.env` in the project root. In PowerShell: `Copy-Item .env.example .env`
5. Open `.env` and set `GEMINI_API_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and a long random `JWT_SECRET` (32+ characters). Keep `PAYPAL_ENV=sandbox`. Never paste secrets into chat or commit `.env`.
6. Start both services: `npm.cmd run dev`
7. Open `http://localhost:5173`. Create the first local account with a valid email and a password of at least 10 characters. This local build permits one workspace account.

The app creates `server/data/txnora.sqlite` automatically. SQLite is embedded through `sql.js`; no separate database server is needed. Uploaded evidence is stored under `server/uploads`.

## Workflow
- Create transaction records and capture conversation, agreement and invoice terms.
- Upload PDF, TXT or Markdown evidence (10 MB default maximum); PDFs are text-extracted.
- Gemini returns structured findings, source quotations, clarification questions and limitations. Supplied evidence is treated as untrusted input.
- The deterministic approval gate permits approval only when analysis reports CONSISTENT. Approval creates a versioned snapshot with SHA-256 digest.
- Create/send/retrieve PayPal invoices from approved snapshots using Sandbox credentials.
- Download a text verification report and inspect the audit trail.
- PayPal webhook endpoint: `POST /api/paypal/webhook`. Configure the webhook URL and webhook ID in PayPal Developer; signature verification is performed against PayPal's verification endpoint and event IDs are deduplicated.

## Starter records and data integrity
Three illustrative fictional transaction records are preloaded on first launch to make the product explorable. They are not real customers, real payments or actual PayPal events. Delete `server/data/txnora.sqlite` before first start only if you intentionally want a fresh database. Set `SEED_STARTER_RECORDS=false` before first launch to skip these records.

## Important boundaries
- Use Sandbox only. Do not enter real customer personal/financial documents or live PayPal credentials.
- This is a local hackathon build, not a production financial service. Authentication is a single local workspace account; it is not multi-tenant and is not suitable for public deployment. JWTs are held in browser local storage; use only on localhost. Set a stable strong `JWT_SECRET` in `.env` or sessions will be invalidated after restart.
- SQLite stores users, transaction payloads, audit events and webhook event IDs. Back up `server/data/txnora.sqlite` and `server/uploads`.
- Webhook verification stores verified events for deduplication; it does not automatically assert that a payment is available for withdrawal. Invoice status, completed capture, available balance and bank withdrawal are distinct states. TXNORA does not control PayPal holds, fees, conversion rates or release decisions.
- Fee/net proceeds are not represented as actual PayPal fee reconciliation unless PayPal supplies the relevant fee/currency data. Never infer funds availability from invoice status.
- The app cannot prevent a user from accepting payment outside TXNORA. AI findings are decision support, not proof of authenticity, fraud detection, KYC or legal advice. A human must review findings and source quotations.

## Commands
- `npm.cmd run dev` — development frontend + API
- `npm.cmd run build` — production frontend build and TypeScript check
- `npm.cmd start` — API server (serve frontend separately for deployment)

## Security note
Do not expose this local build to the public internet. A production release requires independent security review, multi-tenant authorization, secure HttpOnly session cookies, CSRF protection, encrypted managed evidence storage, malware scanning, retention/deletion controls, database backup/recovery, monitoring and tested payment lifecycle reconciliation.
