# Shared Validators

This package contains shared Zod validators and TypeScript types for the voter file tool monorepo. It provides type-safe validation schemas that can be used across both the frontend and report-server applications.

## Features

- **Type-safe validation** with Zod schemas
- **Shared types** across frontend and backend
- **Comprehensive API validation** for all endpoints
- **Webhook payload validation** for secure communication
- **Environment variable validation**

## Usage

### Installation

```bash
# From the monorepo root
pnpm add @voter-file-tool/shared-validators

# Or install dependencies
pnpm install
```

### Basic Usage

```typescript
import {
  generateReportSchema,
  webhookPayloadSchema,
  type GenerateReportData,
  type WebhookPayload,
} from '@voter-file-tool/shared-validators';

// Validate incoming data
const result = generateReportSchema.safeParse(requestData);
if (!result.success) {
  return { error: 'Validation failed', issues: result.error.issues };
}

const validatedData: GenerateReportData = result.data;
```

### Available Schemas

- **Report Schemas**: `generateReportSchema`, `enrichedReportDataSchema`
- **Webhook Schemas**: `webhookPayloadSchema`
- **Committee Schemas**: `ldCommitteesArraySchema`, `committeeMemberSchema`
- **Petition Schemas**: `generateDesignatedPetitionDataSchema`
- **API Schemas**: `apiRequestSchema`, `apiResponseSchema`, `errorResponseSchema`

### Type Exports

All schemas export their corresponding TypeScript types:

```typescript
import type {
  GenerateReportData,
  WebhookPayload,
  CommitteeMember,
  Candidate,
  ErrorResponse,
} from '@voter-file-tool/shared-validators';
```

## Development

### Building

```bash
pnpm build
```

### Watching for changes

```bash
pnpm dev
```

### Cleaning

```bash
pnpm clean
```

## Schema Validation

All schemas include comprehensive validation rules:

- **Required fields** are properly validated
- **String lengths** and **format requirements** are enforced
- **UUID validation** for IDs
- **URL validation** for endpoints
- **Number ranges** for pagination and limits
- **Array constraints** for minimum/maximum items

## Error Handling

The package provides structured error responses with detailed validation messages:

```typescript
const result = schema.safeParse(data);
if (!result.success) {
  return {
    error: 'Validation failed',
    details: result.error.errors,
  };
}
```
