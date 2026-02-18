# Development Scripts

For full local dev (DB + R2 + report-server + frontend), see [docs/LOCAL_DEVELOPMENT.md](../docs/LOCAL_DEVELOPMENT.md).

## setup-dev-db.sh

Automated script to set up your development database environment with Docker and Prisma.

### Prerequisites

- Docker Desktop installed and running
- `.env` file in `apps/frontend/` with required variables (see below)
- pnpm installed

### Required Environment Variables

Your `apps/frontend/.env` file must contain:

```bash
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_database
POSTGRES_PORT=5432
POSTGRES_PRISMA_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}
```

### Usage

#### From workspace root:

```bash
./scripts/setup-dev-db.sh           # Use existing database if present
./scripts/setup-dev-db.sh --fresh   # Remove old volume, start fresh
./scripts/setup-dev-db.sh --help    # Show usage info
```

#### From frontend directory:

```bash
cd apps/frontend
pnpm db:setup           # Use existing database if present
pnpm db:setup --fresh   # Remove old volume, start fresh
```

### What the Script Does

1. **Checks Docker daemon** - Verifies Docker Desktop is running
2. **Validates environment** - Checks for `.env` file and required variables
3. **Handles existing data** - Prompts you to keep or remove existing database
4. **Manages containers** - Stops, removes, and starts Docker containers
5. **Waits for Postgres** - Ensures database is ready before proceeding
6. **Runs migrations** - Applies all Prisma migrations
7. **Seeds database** - Automatically adds privileged users (mpresberg@gmail.com as Developer)
8. **Rebuilds packages** - Updates shared packages that depend on Prisma

### Options Explained

#### Default Behavior (no flags)
- If no database volume exists: Creates new database with migrations
- If database volume exists: Prompts you to keep or remove it

#### `--fresh` Flag
- Always removes existing database volume
- Creates clean database with migrations
- No prompts - fully automated

#### `--help` Flag
- Shows usage information
- Lists all available options
- Provides examples

### Common Issues

#### "Docker daemon is not running"
**Solution**: Open Docker Desktop and wait for it to fully start before running the script.

#### "Cannot connect to the Docker daemon"
**Solution**: This usually means Docker Desktop is starting up. Wait a few seconds and try again.

#### ".env file not found"
**Solution**: Create a `.env` file in `apps/frontend/` with the required variables listed above.

#### "Missing required environment variables"
**Solution**: Ensure all required variables are set in your `.env` file.

#### "Postgres failed to become ready"
**Solution**: 
- Check container logs: `docker logs frontend-postgres-1`
- Ensure port is not already in use
- Try running with `--fresh` flag

### Manual Database Operations

#### Connect to database:
```bash
pnpm dbconnect
```

#### View container logs:
```bash
docker logs frontend-postgres-1
```

#### Stop database without removing data:
```bash
cd apps/frontend
docker compose down
```

#### Remove database and all data:
```bash
cd apps/frontend
docker compose down -v
```

#### Run migrations manually:
```bash
cd apps/frontend
pnpm db_migrate
```

#### Seed database manually:
```bash
cd apps/frontend
pnpm db:seed
```

#### Verify privileged users:
```bash
cd apps/frontend
pnpm dbconnect
# Then in psql:
SELECT * FROM "PrivilegedUser";
```

### Development Workflow

#### First-time setup:
```bash
./scripts/setup-dev-db.sh
```

#### Starting work (database already exists):
```bash
cd apps/frontend
docker compose up -d
```

#### After pulling new migrations:
```bash
cd apps/frontend
pnpm db_migrate
```

#### Reset database (testing/debugging):
```bash
./scripts/setup-dev-db.sh --fresh
```

## Database Seeding

The setup script automatically seeds the database with initial privileged users after running migrations.

### Default Privileged Users

- **mpresberg@gmail.com** - Developer privileges

### How Seeding Works

1. When you run `pnpm db_migrate` or the setup script, Prisma automatically executes `prisma/seed.ts`
2. The seed file uses `upsert` operations, so it's safe to run multiple times
3. Existing users are updated, new users are created
4. Seeding happens after all migrations are applied

### Privilege System

The application uses a two-table privilege system:

1. **PrivilegedUser table**: Pre-authorizes users by email before they sign in
2. **User table**: Created when a user signs in via Google OAuth
3. **Auth flow**: When a privileged user signs in, the system automatically grants them their assigned privilege level

### Privilege Levels

- **Developer**: Highest level access (full system control)
- **Admin**: Administrative access
- **RequestAccess**: Requested but not yet granted
- **ReadAccess**: Default for new users (read-only)

### Adding More Privileged Users

Edit `apps/frontend/prisma/seed.ts` and add additional upsert operations:

```typescript
const anotherUser = await prisma.privilegedUser.upsert({
  where: { email: 'user@example.com' },
  update: { privilegeLevel: PrivilegeLevel.Admin },
  create: {
    email: 'user@example.com',
    privilegeLevel: PrivilegeLevel.Admin,
  },
});
```

Then run:
```bash
cd apps/frontend
pnpm db:seed
```
