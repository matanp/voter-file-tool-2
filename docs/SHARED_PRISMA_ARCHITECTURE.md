# Shared Prisma Architecture Pattern

## Overview

This document outlines the recommended architecture pattern for sharing Prisma types across multiple applications in a monorepo while maintaining type safety and database access capabilities.

## 🏗️ Architecture Pattern

### **Core Concept**

- **Single Database**: All applications connect to the same PostgreSQL database
- **Shared Types**: Type definitions are shared via a dedicated package
- **Separate Clients**: Each application maintains its own PrismaClient instance
- **Type Consistency**: All applications use identical type definitions

## 📦 Package Structure

```
packages/
├── shared-prisma/           # Prisma types + server-only query helpers
│   ├── src/index.ts        # Exports all Prisma types and the helpers
│   ├── src/committeeResidency.ts # e.g. the committee residency rule
│   ├── package.json        # Dependencies: @prisma/client
│   └── tsconfig.json       # TypeScript configuration
│
apps/
├── frontend/               # Next.js application
│   ├── prisma/schema.prisma # Source of truth for schema
│   ├── package.json        # Dependencies: @prisma/client
│   └── src/lib/prisma.ts   # PrismaClient instance
│
└── report-server/          # Node.js application
    ├── package.json        # Dependencies: @prisma/client + shared-prisma
    └── src/lib/prisma.ts   # PrismaClient instance
```

## 🔧 Implementation Details

### **1. Shared-Prisma Package (`packages/shared-prisma`)**

**Purpose**: Export all Prisma types for consumption by other applications, plus server-only query helpers that several apps share (e.g. the committee residency rule in `committeeResidency.ts`, BOE eligibility flagging in `boeEligibilityFlagging.ts`)

```typescript
// src/index.ts
export type {
  // Model types
  User,
  VoterRecord,
  Report,
  // ... all other models
} from '@prisma/client';

// Re-export PrismaClient class
export { PrismaClient } from '@prisma/client';

// Re-export Prisma namespace for input types
export type { Prisma } from '@prisma/client';

// Re-export error types
export {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  // ... other error types
} from '@prisma/client/runtime/library';
```

**Key Features**:

- ✅ Prisma types plus server-only query helpers (never import it from client bundles; see the anti-pattern below)
- ✅ Automatically rebuilds when schema changes
- ✅ Exports all Prisma types and utilities
- ✅ No PrismaClient instance (helpers take the caller's client as an argument)

### **2. Frontend Application (`apps/frontend`)**

**Purpose**: Primary application with Prisma schema and database operations

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Key Features**:

- ✅ Own PrismaClient instance
- ✅ Direct `@prisma/client` dependency
- ✅ Runs migrations (`prisma migrate dev`)
- ✅ Generates Prisma client (`prisma generate`)
- ✅ Depends on shared-prisma for shared server-only helpers (e.g. `findResidencyMismatch`)

### **3. Report-Server Application (`apps/report-server`)**

**Purpose**: Secondary application with database access and type safety

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.POSTGRES_PRISMA_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Usage Example**:

```typescript
// src/examples/workingExample.ts
import { prisma } from '../lib/prisma';
import {
  type User,
  type VoterRecord,
  type Prisma,
} from '@voter-file-tool/shared-prisma';

export async function generateReport(userId: string) {
  // Type-safe database operations
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { Report: true },
  });

  const voterRecords = await prisma.voterRecord.findMany({
    where: { party: 'Democratic' },
    select: { VRCNUM: true, lastName: true, firstName: true },
  });

  return { user, voterRecords };
}
```

## 🔄 Build and Migration Process

### **Schema Changes Workflow**

1. **Modify Schema**: Update `apps/frontend/prisma/schema.prisma`
2. **Run Migration**: `cd apps/frontend && pnpm db_migrate`
3. **Auto-Rebuild**: Migration script rebuilds shared-prisma package
4. **Type Sync**: All applications get updated types automatically

### **Migration Script**

```json
// apps/frontend/package.json
{
  "scripts": {
    "db_migrate": "prisma migrate dev && cd ../../ && pnpm --filter @voter-file-tool/shared-prisma build"
  }
}
```

## 🌐 Database Connection

### **Environment Variables**

Both applications use the same database connection:

```env
# .env (shared across applications)
POSTGRES_PRISMA_URL="postgresql://user:password@localhost:5432/voter_file_db"
```

For local development you can use a local database via Docker ([scripts/README.md](../scripts/README.md)) or point `POSTGRES_PRISMA_URL` at a remote/prod DB; see [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md).

### **Connection Pooling**

Each application manages its own connection pool:

```typescript
// Frontend: ~10-20 connections
const frontendPrisma = new PrismaClient();

// Report-server: ~5-10 connections
const reportServerPrisma = new PrismaClient();
```

## ✅ Benefits

### **Type Safety**

- ✅ Compile-time type checking across all applications
- ✅ IntelliSense and autocomplete support
- ✅ Refactoring safety (rename fields, update types)

### **Consistency**

- ✅ Identical type definitions across applications
- ✅ Single source of truth for data models
- ✅ Automatic synchronization when schema changes

### **Scalability**

- ✅ Independent deployment of applications
- ✅ Separate connection pools
- ✅ No shared state between applications

### **Developer Experience**

- ✅ Clear separation of concerns
- ✅ Easy to understand and maintain
- ✅ Standard Prisma patterns in each app

## ⚠️ Considerations

### **Database Connections**

- Monitor total connection count (frontend + report-server)
- Consider connection pooling strategies
- Use read replicas for read-heavy operations

### **Schema Management**

- Only run migrations from one application (frontend)
- Ensure all applications use the same schema version
- Test migrations in development before production

### **Type Updates**

- Shared-prisma rebuilds automatically on schema changes
- Applications may need restart to pick up new types
- Consider using `pnpm dev` for automatic rebuilding

## 🚀 Usage Patterns

### **Frontend Application**

```typescript
// Direct Prisma usage with full type safety
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getUsers() {
  return await prisma.user.findMany({
    include: { accounts: true, sessions: true },
  });
}
```

### **Report-Server Application**

```typescript
// PrismaClient + shared types
import { PrismaClient } from '@prisma/client';
import { type User, type Prisma } from '@voter-file-tool/shared-prisma';

const prisma = new PrismaClient();

export async function generateReport(filters: Prisma.VoterRecordWhereInput) {
  return await prisma.voterRecord.findMany({
    where: filters,
    select: { VRCNUM: true, lastName: true, firstName: true },
  });
}
```

## 📋 Package Dependencies

### **Frontend**

```json
{
  "dependencies": {
    "@prisma/client": "^5.15.0"
  },
  "devDependencies": {
    "prisma": "^5.15.0"
  }
}
```

### **Report-Server**

```json
{
  "dependencies": {
    "@prisma/client": "^5.15.0",
    "@voter-file-tool/shared-prisma": "workspace:^"
  },
  "devDependencies": {
    "prisma": "^5.15.0"
  }
}
```

### **Shared-Prisma**

```json
{
  "dependencies": {
    "@prisma/client": "^5.15.0"
  },
  "peerDependencies": {
    "@prisma/client": "^5.15.0"
  }
}
```

## 🎯 Best Practices

1. **Single Source of Truth**: Keep schema in frontend, share types via shared-prisma
2. **Type Safety**: Always use shared types in report-server for consistency
3. **Connection Management**: Use singleton pattern for PrismaClient instances
4. **Environment Variables**: Share database connection string across applications
5. **Migration Strategy**: Run migrations from frontend, rebuild shared-prisma
6. **Error Handling**: Use Prisma error types from shared-prisma package
7. **Testing**: Test type compatibility between applications

## ⛔ Anti-Pattern: Re-exporting Prisma Runtime from Client-Safe Packages

**What not to do:** Re-export PrismaClient, Prisma runtime utilities, or server-only functions (e.g. `runBoeEligibilityFlagging`) from packages that are imported by `"use client"` components or other client bundles (e.g. `shared-validators`).

**Why:** Webpack/Turbopack traces imports; any client-component import of such a package will pull Prisma into the client bundle. Prisma relies on Node.js built-ins (`async_hooks`, etc.) that do not exist in the browser, causing build failures (e.g. on Vercel).

**What to do:** Keep server-only code in `shared-prisma`. Packages like `shared-validators` may use `import type` from shared-prisma (erased at compile time). Server code should import BOE helpers and Prisma types from `@voter-file-tool/shared-prisma` directly.

## 🔍 Troubleshooting

### **Common Issues**

1. **Type Mismatches**: Ensure shared-prisma is rebuilt after schema changes
2. **Connection Errors**: Verify environment variables are consistent
3. **Build Failures**: Check that all applications have correct dependencies
4. **Migration Conflicts**: Only run migrations from one application

### **Debugging Steps**

1. Check if shared-prisma package is built: `pnpm --filter @voter-file-tool/shared-prisma build`
2. Verify database connection: Test with `prisma db pull`
3. Ensure type consistency: Compare types between applications
4. Check environment variables: Verify `POSTGRES_PRISMA_URL` is set

## 📈 Performance Considerations

- **Connection Pooling**: Each app manages its own pool
- **Query Optimization**: Use select/include clauses appropriately
- **Caching**: Consider Redis for frequently accessed data
- **Read Replicas**: Use for read-heavy operations in report-server

This architecture provides a robust, type-safe, and scalable solution for sharing Prisma types across multiple applications while maintaining clean separation of concerns.
