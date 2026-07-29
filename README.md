# Voter File Tool

Voter file management, report generation (PDF/XLSX), and committee membership governance. Import BOE voter files, run designated petition and absentee reports, and manage committee membership.

## Tech Stack

- **Frontend:** Next.js, Prisma
- **Report server:** Node/Express, Puppeteer (PDF generation)
- **Storage:** Cloudflare R2, Neon Postgres
- **Realtime:** Ably (report status)

## Monorepo Structure

```
apps/
├── frontend/        # Next.js app (Vercel)
└── report-server/   # PDF/report generation (Lightsail)
packages/
├── shared-prisma/  # Prisma types
├── shared-validators/
├── voter-import-processor/
└── xlsx-tester/
```

## Documentation

- **Local development** → [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md)
- **Deployment** → [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md), [infrastructure/DEPLOYMENT_SETUP.md](infrastructure/DEPLOYMENT_SETUP.md)
- **Shared Prisma** → [docs/SHARED_PRISMA_ARCHITECTURE.md](docs/SHARED_PRISMA_ARCHITECTURE.md)
- **SRS implementation roadmap** → [docs/SRS/SRS_IMPLEMENTATION_ROADMAP.md](docs/SRS/SRS_IMPLEMENTATION_ROADMAP.md)
- **SRS ticket index / status** → [docs/SRS/tickets/README.md](docs/SRS/tickets/README.md)

## Current Phase 1 Follow-Up Tickets (SRS)

- [1.R.1 Leader Privilege Escalation](docs/SRS/tickets/1.R.1-leader-privilege-escalation.md) (P0)
- [1.R.2 requestAdd Resubmission for Non-Active Memberships](docs/SRS/tickets/1.R.2-requestAdd-resubmission-non-active.md) (P1)
- [1.R.3 Replacement Flow Not Implemented in handleRequest](docs/SRS/tickets/1.R.3-replacement-flow-not-implemented.md) (P1)
- [1.R.4 Bulk Import Incompatible with Phase 1 Schema](docs/SRS/tickets/1.R.4-bulk-import-phase1-incompatible.md) (P1)
- [1.R.5 Source-of-Truth Split](docs/SRS/tickets/1.R.5-source-of-truth-split.md) (P1)
- [1.R.6 Audit Tests Fail](docs/SRS/tickets/1.R.6-audit-tests-fail.md) (P2)
- [1.R.7 Capacity + Seat Assignment Non-Atomic](docs/SRS/tickets/1.R.7-capacity-seat-assignment-non-atomic.md) (P2)

## Contributing

See [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) for setup. Run `pnpm run build:packages` from root before starting the report-server.
