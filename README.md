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

## Contributing

See [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) for setup. Run `pnpm run build:packages` from root before starting the report-server.
