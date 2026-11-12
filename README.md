# TXNORA — Every Transaction, Traceable.

**AI-powered transaction consistency verification and evidence-linked PayPal invoicing for freelancers and small exporters.**

TXNORA helps freelancers and small exporters organise transaction evidence, identify inconsistencies before requesting payment, and create PayPal invoices from human-approved transaction records.

Instead of relying on scattered conversations, agreements and invoice details, TXNORA brings transaction information into one traceable workflow.

## The Problem

Freelancers and small exporters often manage payment-related information across emails, messages, agreements, documents and invoices.

This creates challenges:

- Transaction details may differ across conversations and agreements.
- Payment amounts, currencies or service descriptions may not match.
- Supporting evidence can become scattered or difficult to retrieve.
- Inconsistencies may go unnoticed before an invoice is issued.
- There may be limited visibility into approval decisions and transaction history.

## Our Solution

TXNORA provides an evidence-linked transaction verification workflow that combines AI-assisted consistency analysis, human approval, audit history and PayPal invoicing.

It helps users review transaction information before moving towards invoice creation.

**The central idea: verify first, approve responsibly, and invoice with traceable records.**

## Key Features

### 1. Transaction Management
- Register and manage transaction records.
- Maintain client, country, service, amount and currency information.
- Record payment terms, due dates, conversations and agreements.
- Search and filter transactions by relevant details and status.

### 2. Evidence Management
- Attach supporting PDF, TXT and Markdown documents.
- Extract text from supported PDF evidence.
- Keep transaction-related evidence connected to its corresponding record.
- Review source information during verification.

### 3. AI-Powered Consistency Analysis
TXNORA uses Gemini to analyse transaction information and identify inconsistencies across the available evidence.

The analysis considers:
- Party or client identity.
- Transaction amount and currency.
- Service description and scope.
- Project dates.
- Payment terms.
- Agreement and invoice details.

The AI produces structured findings, source quotations, clarification questions and analysis limitations.

AI findings support human decision-making; they are not proof of authenticity or fraud detection.

### 4. Human Approval and Verification
- Review AI findings before approval.
- Use a deterministic approval gate that permits approval only when the analysis reports CONSISTENT.
- Create a versioned approval snapshot.
- Generate a SHA-256 digest for the approved snapshot.

This separates automated analysis from the final human approval decision.

### 5. PayPal Invoice Workflow
- Connect with the PayPal REST API using Sandbox credentials.
- Create invoices from approved transaction snapshots.
- Send and retrieve invoice information.
- Inspect available invoice status information.

TXNORA uses PayPal Sandbox for its hackathon workflow. It does not represent a live payment-processing service.

### 6. Audit Trail and Reports
- Inspect recorded transaction activity.
- Review approval-related history.
- Download text-based transaction verification reports.
- Maintain traceability between transaction information and approval records.

### 7. Dashboard and User Experience
- Centralised transaction overview.
- Transaction status and attention indicators.
- Light and dark appearance modes.
- Workspace and currency settings.

## How TXNORA Works

1. **Register:** Create a transaction with client, service and payment information.
2. **Collect evidence:** Attach relevant supporting documents and record conversation and agreement details.
3. **Analyse:** Run AI-assisted consistency checks across the available information.
4. **Review:** Examine findings, source quotations and identified discrepancies.
5. **Approve:** Human approval is permitted only when the analysis reports CONSISTENT.
6. **Create invoice:** Use the approved transaction snapshot to create a PayPal Sandbox invoice.
7. **Track:** Review available invoice information, reports and audit history.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express |
| Database | SQLite using sql.js |
| AI analysis | Gemini API |
| Payment integration | PayPal REST API Sandbox |
| Verification | SHA-256 snapshot digest |
| Evidence processing | PDF text extraction and document handling |

## System Architecture

- **Frontend:** React and TypeScript application built with Vite.
- **Backend:** Express API handles authentication, transaction operations, analysis, evidence and invoice workflows.
- **Database:** SQLite persistence through sql.js, without requiring a separate SQLite server.
- **AI layer:** Gemini-based structured transaction consistency analysis.
- **Payment layer:** PayPal REST Sandbox integration for invoice operations.

## Getting Started

### Requirements

- Node.js 20.19+ or 22.12+.
- Internet access for initial dependency installation.
- Gemini API key.
- PayPal Developer Sandbox REST application Client ID and Secret.

### Windows Setup

1. Clone or download this repository.
2. Open the TXNORA project root folder in VS Code.
3. Open the integrated terminal using PowerShell.
4. Confirm that you are in the directory containing `package.json`.

Install dependencies:

```powershell
npm.cmd install
```

Create your environment file:

```powershell
Copy-Item .env.example .env
```

Open `.env` and configure:

```env
GEMINI_API_KEY=your_gemini_api_key
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_ENV=sandbox
JWT_SECRET=your_long_random_secret
```

Use a strong random JWT secret of at least 32 characters. Never commit `.env` or share your credentials.

Start the application:

```powershell
npm.cmd run dev
```

Open the application:

```text
http://localhost:5173
```

Create the first local workspace account using a valid email address and a password of at least 10 characters.

### Available Commands

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd start
```

- `npm.cmd install` — installs project dependencies.
- `npm.cmd run dev` — starts the development frontend and API.
- `npm.cmd run build` — builds the frontend and performs the configured TypeScript checks.
- `npm.cmd start` — starts the API server.

## Database and Evidence Storage

The application automatically creates its SQLite database at:

```text
server/data/txnora.sqlite
```

Uploaded evidence is stored under:

```text
server/uploads
```

The database uses sql.js, so a separate SQLite database server is not required.

## Demonstration Data

Three illustrative fictional transaction records are preloaded on first launch.

These records are provided to demonstrate the application workflow. They do not represent real customers, actual payments or genuine PayPal events.

Set the following environment variable before first launch to skip the starter records:

```env
SEED_STARTER_RECORDS=false
```

## PayPal Webhook

TXNORA provides the following webhook endpoint:

```text
POST /api/paypal/webhook
```

Configure the webhook URL and webhook ID in the PayPal Developer Dashboard.

Webhook signature verification is performed against PayPal's verification endpoint, and event IDs are deduplicated.

A publicly accessible HTTPS endpoint is required for external webhook delivery. A localhost-only application cannot directly receive PayPal webhooks.

## Security and Limitations

TXNORA is a local hackathon prototype, not a production financial service.

- Use PayPal Sandbox credentials only.
- Do not upload real customer financial or personal documents.
- Authentication currently supports one local workspace account.
- The application is not multi-tenant and is not designed for public deployment.
- JWTs are held in browser local storage; use this prototype only on localhost.
- Configure a stable, strong JWT secret in `.env`.
- AI findings are decision-support information, not proof of authenticity, fraud detection, KYC or legal advice.
- Human review remains necessary.
- Invoice status does not establish that funds are available for withdrawal.
- PayPal fees, conversion rates, payment holds and release decisions are outside TXNORA's control.

A production release would require independent security review, multi-tenant authorization, secure session management, encrypted evidence storage, malware scanning, retention controls, backup and recovery, monitoring and payment lifecycle reconciliation.

## Project Scope

TXNORA demonstrates how AI-assisted evidence review and payment workflows can help make transaction information more organised and traceable.

It is designed as a prototype for freelancers and small exporters who need better visibility into transaction details before invoicing.

## Hackathon Project

**TXNORA — Every Transaction, Traceable.**

Built for the PayPal AI Hackathon 2026.

