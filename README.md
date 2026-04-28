# streampay-frontend

**StreamPay** dashboard — Next.js app for Stellar wallet integration and payment stream management.

## Overview

Next.js 15 (React, TypeScript) frontend for the StreamPay protocol. Users will connect Stellar wallets and create/manage payment streams from this dashboard.

## Security Configuration

This application implements strict environment profiles for Stellar testnet and mainnet to prevent dangerous configuration mistakes. See [docs/network-security.md](docs/network-security.md) for complete security documentation.

### Required Environment Variables

The application will fail to boot without these required variables:

- `STELLAR_NETWORK` - Network selection: `testnet` or `mainnet`
- `JWT_SECRET` - JWT signing secret (minimum 32 characters)

### Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Configure for testnet (development):
   ```env
   STELLAR_NETWORK=testnet
   JWT_SECRET=dev-secret-key-at-least-32-chars
   NODE_ENV=development
   ```

3. Start the application:
   ```bash
   npm run dev
   ```

### Security Features

- **Fail-fast validation**: Application refuses to start with invalid configuration
- **No silent defaults**: Never falls back to mainnet automatically
- **CI guardrails**: CI is enforced to use testnet only
- **Secret redaction**: All secrets are automatically redacted from logs
- **UI safety labels**: Testnet assets are clearly labeled to prevent confusion
- **Centralized config**: All network configuration in one module

See [docs/network-security.md](docs/network-security.md) for the complete security guide.

## Schedule semantics

- Calendar-month schedules use UTC day boundaries for proration.
- Mid-month starts and last-day pauses are prorated using inclusive UTC days.
- Short months use actual day counts (no 30/32-day months).
- Local time display may shift with DST; calculations remain UTC.

## Prerequisites

- Node.js 18+
- npm (or yarn/pnpm)

## Setup for contributors

1. **Clone and enter the repo**
   ```bash
   git clone <repo-url>
   cd streampay-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify setup**
   ```bash
   npm run build
   npm test
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```

App will be at `http://localhost:3000`.

## Scripts

| Command        | Description           |
|----------------|-----------------------|
| `npm run dev`  | Start dev server      |
| `npm run build`| Production build      |
| `npm start`    | Run production build  |
| `npm test`     | Run Jest tests        |
| `npm run lint` | Next.js ESLint        |

## CI/CD

On every push/PR to `main`, GitHub Actions runs:

- Install: `npm ci`
- Build: `npm run build`
- Tests: `npm test`

Ensure the workflow passes before merging.

## Project structure

```
streampay-frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── page.test.tsx
│   └── globals.css
├── next.config.ts
├── tsconfig.json
├── jest.config.js
├── jest.setup.ts
├── .github/workflows/ci.yml
└── README.md
```

## Asset Amount Validation Policy

`app/lib/amount.ts` centralizes amount parsing and stream escrow math used by the frontend stream list.

- Supported assets are intentionally allow-listed: `XLM`, `USDC`.
- Amount inputs must be plain decimal strings with at most 7 fractional digits (Stellar stroop precision).
- Negative values are rejected.
- Values above signed int64 bounds are rejected.
- Escrow derivation rejects sub-stroop outcomes (no implicit rounding).
- Validation returns explicit 4xx-style error metadata (`httpStatus` + error `code`) so invalid user input does not bubble into 500-class failures.

## Fuzz and Property-style Tests

- `app/lib/amount.test.ts` includes deterministic fuzz-style checks (seeded RNG) with bounded runtime.
- Bounded fuzz runs in normal CI because it is fast; if runtime grows in the future, keep deterministic unit coverage in CI and move larger fuzz campaigns to nightly workflows.

## License

MIT
