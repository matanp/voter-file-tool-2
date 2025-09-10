# API Type Safety Implementation

This document outlines the comprehensive API type safety implementation using Zod validators shared across the monorepo.

## Overview

We've implemented a robust type-safe API system with the following components:

1. **Shared Validators Package** (`packages/shared-validators/`)
2. **Refactored API Endpoints** with full type safety
3. **Webhook Validation** with proper error handling
4. **Environment Variable Validation** for configuration safety

## Architecture

### Shared Validators Package

Located at `packages/shared-validators/`, this package provides:

- **Zod schemas** for all API requests and responses
- **TypeScript types** inferred from schemas
- **Validation utilities** for runtime type checking
- **Environment validation** for configuration safety

### Key Schemas

#### Report Schemas

- `generateReportSchema` - Validates report generation requests
- `enrichedReportDataSchema` - Validates enriched report data with additional fields
- `reportCompleteWebhookPayloadSchema` - Validates report complete webhook callbacks
- `generateReportResponseSchema` - Validates API responses
- `reportCompleteResponseSchema` - Validates completion responses

#### Committee Schemas

- `ldCommitteesArraySchema` - Validates committee data arrays
- `committeeMemberSchema` - Validates individual committee members

#### Petition Schemas

- `generateDesignatedPetitionDataSchema` - Validates petition data
- `candidateSchema` - Validates candidate information
- `vacancyAppointmentSchema` - Validates vacancy appointments

#### API Schemas

- `apiRequestSchema` - Base API request validation
- `apiResponseSchema` - Base API response validation
- `errorResponseSchema` - Standardized error responses
- `callbackUrlSchema` - URL validation for callbacks

## Implementation Details

### Frontend API Endpoints

#### `/api/generateReport`

- **Type Safety**: Full TypeScript typing with `GenerateReportResponse | ErrorResponse`
- **Validation**: Uses `generateReportSchema` for request validation
- **Error Handling**: Structured error responses with detailed validation messages
- **Response Types**: Properly typed success and error responses

#### `/api/reportComplete`

- **Type Safety**: Full TypeScript typing with `ReportCompleteResponse | ErrorResponse`
- **Validation**: Uses `reportCompleteWebhookPayloadSchema` for webhook validation
- **Security**: HMAC signature verification with proper error handling
- **Response Types**: Standardized response format

### Report Server

#### `/start-job` Endpoint

- **Type Safety**: Validates incoming requests with `enrichedReportDataSchema`
- **Queue Processing**: Properly typed queue with `EnrichedReportData`
- **Callback Validation**: Uses `webhookPayloadSchema` for callback payloads
- **Environment Validation**: Validates `CALLBACK_URL` on startup

#### Job Processing

- **Type Safety**: `processJob` function uses `EnrichedReportData` type
- **Callback Safety**: Properly typed `ReportCompleteWebhookPayload` for webhook callbacks
- **Error Handling**: Structured error responses with proper typing

## Benefits

### 1. **Runtime Type Safety**

- All API requests and responses are validated at runtime
- Invalid data is caught early with detailed error messages
- Prevents runtime errors from malformed data

### 2. **Compile-Time Type Safety**

- Full TypeScript support across frontend and backend
- IntelliSense and autocomplete for all API types
- Compile-time error detection

### 3. **Consistent Error Handling**

- Standardized error response format across all endpoints
- Detailed validation error messages
- Proper HTTP status codes

### 4. **Maintainability**

- Single source of truth for API schemas
- Easy to update validation rules
- Shared types prevent inconsistencies

### 5. **Security**

- Webhook signature validation
- Environment variable validation
- Input sanitization and validation

## Usage Examples

### Frontend API Call

```typescript
import {
  generateReportSchema,
  type GenerateReportData,
  type GenerateReportResponse,
} from '@voter-file-tool/shared-validators';

// Validate request data
const result = generateReportSchema.safeParse(requestData);
if (!result.success) {
  return { error: 'Validation failed', issues: result.error.issues };
}

const validatedData: GenerateReportData = result.data;
```

### Backend Validation

```typescript
import {
  reportCompleteWebhookPayloadSchema,
  type ReportCompleteWebhookPayload,
} from '@voter-file-tool/shared-validators';

// Validate webhook payload
const validationResult = reportCompleteWebhookPayloadSchema.safeParse(body);
if (!validationResult.success) {
  return NextResponse.json(
    {
      error: 'Invalid payload',
      details: validationResult.error.errors,
    },
    { status: 400 }
  );
}

const payload: ReportCompleteWebhookPayload = validationResult.data;
```

## Environment Configuration

The system validates critical environment variables:

- `WEBHOOK_SECRET` - Required for webhook security
- `CALLBACK_URL` - Validated as proper URL
- `PDF_SERVER_URL` - Optional, validated as URL
- `ABLY_API_KEY` - Optional, validated as non-empty string

## Error Response Format

All API endpoints return consistent error responses:

```typescript
interface ErrorResponse {
  error: string;
  message?: unknown;
  details?: any[];
  issues?: any[];
}
```

## Migration Notes

### Removed Files

- `apps/frontend/src/lib/validators/generateReport.ts`
- `apps/frontend/src/lib/validators/designatedPetition.ts`
- `apps/frontend/src/lib/validators/ldCommittees.ts`

### Updated Dependencies

- Added `@voter-file-tool/shared-validators` to both frontend and report-server
- All validation now uses shared schemas

### Breaking Changes

- None - all existing functionality preserved
- Enhanced with additional type safety and validation

## Future Enhancements

1. **API Documentation Generation** - Auto-generate OpenAPI specs from Zod schemas
2. **Client SDK Generation** - Generate typed client libraries
3. **Testing Utilities** - Shared test data generators from schemas
4. **Performance Monitoring** - Track validation performance metrics

## Conclusion

This implementation provides comprehensive API type safety across the entire monorepo, ensuring data integrity, improving developer experience, and reducing runtime errors. The shared validator package serves as a single source of truth for all API contracts, making the system more maintainable and reliable.
