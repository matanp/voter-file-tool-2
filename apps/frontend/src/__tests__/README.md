# API Endpoint Testing Guide

This directory contains comprehensive unit tests for the voter file tool API endpoints. The testing strategy focuses on testing API route handlers in isolation with proper mocking of dependencies.

## Testing Framework

- **Jest**: Test runner and assertion library
- **ts-jest**: TypeScript support for Jest
- **Custom mocks**: For Next.js, Prisma, and authentication

## Test Structure

```
src/__tests__/
├── api/                    # API endpoint tests
│   ├── fetchCommitteeList.test.ts
│   └── committee/
│       ├── add.test.ts
│       ├── remove.test.ts
│       └── requestAdd.test.ts
├── utils/
│   └── testUtils.ts        # Test utilities and helpers
└── README.md              # This file
```

## Testing Patterns

### 1. Test File Organization

Each API endpoint has its own test file following the pattern:

- `{endpoint-name}.test.ts`
- Located in a directory structure matching the API routes
- Contains comprehensive test cases for all scenarios

### 2. Test Case Structure

Each test follows the **Arrange-Act-Assert** pattern:

```typescript
it("should do something specific", async () => {
  // Arrange - Set up mocks and test data
  const mockData = createMockData();
  mockPrisma.someMethod.mockResolvedValue(expectedResult);

  // Act - Execute the function being tested
  const response = await handler(request);

  // Assert - Verify the expected behavior
  expectSuccessResponse(response, expectedData);
  expect(mockPrisma.someMethod).toHaveBeenCalledWith(expectedArgs);
});
```

### 3. Mocking Strategy

#### Prisma Client Mocking

```typescript
jest.mock("~/lib/prisma", () => ({
  __esModule: true,
  default: {
    committeeList: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      // ... other methods
    },
  },
}));
```

#### Authentication Mocking

```typescript
jest.mock("~/auth", () => ({
  auth: jest.fn(),
}));
```

#### Utility Function Mocking

```typescript
jest.mock("~/lib/utils", () => ({
  hasPermissionFor: jest.fn(),
}));
```

### 4. Test Data Factories

Use factory functions to create consistent test data:

```typescript
export const createMockSession = (overrides = {}) => ({
  user: {
    id: "test-user-id",
    privilegeLevel: PrivilegeLevel.Admin,
    ...overrides.user,
  },
  ...overrides,
});
```

### 5. Response Assertion Helpers

Use helper functions for common assertions:

````typescript
export const expectSuccessResponse = async (response: Response, expectedData?: unknown) => {
  expect(response.status).toBe(200);
  if (typeof expectedData !== "undefined") {
    await expect(response.json()).resolves.toEqual(expectedData);
  }
};

export const expectErrorResponse = async (
  response: Response,
  expectedStatus: number,
  expectedError?: unknown,
) => {
  expect(response.status).toBe(expectedStatus);
  if (typeof expectedError !== "undefined") {
    await expect(response.json()).resolves.toEqual({ error: expectedError });
  }
};

## Test Categories

### 1. Happy Path Tests

- Valid requests with proper authentication
- Expected successful responses
- Correct database interactions

### 2. Authentication Tests

- Unauthenticated requests (401)
- Insufficient privileges (403)
- Different privilege levels
- **Shared authentication test suite**: Use `createAuthTestSuite()` for consistent authentication testing across all endpoints

### 3. Validation Tests

- Missing required fields (400)
- Invalid data types (400)
- Malformed requests (400)

### 4. Business Logic Tests

- Entity not found scenarios (404)
- Duplicate data handling
- Edge cases and boundary conditions

### 5. Error Handling Tests

- Database errors (500)
- Unexpected exceptions (500)
- Network failures

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test fetchCommitteeList.test.ts
````

## Coverage Goals

- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >90%
- **Lines**: >90%

## Shared Authentication Testing

### Using the Shared Authentication Test Suite

The test utilities now include a comprehensive shared authentication testing framework that eliminates code duplication and ensures consistent authentication testing across all endpoints.

#### Basic Usage

```typescript
import {
  createAuthTestSuite,
  type AuthTestConfig,
} from "../../utils/testUtils";

describe("Authentication tests", () => {
  const authConfig: AuthTestConfig = {
    endpointName: "/api/your-endpoint",
    requiredPrivilege: PrivilegeLevel.Admin, // or RequestAccess, ReadAccess, etc.
    mockRequest: () => createMockRequest(yourTestData),
  };

  const setupMocks = () => {
    // Setup database mocks for successful test cases
    prismaMock.yourModel.method.mockResolvedValue(mockData);
  };

  const authTestSuite = createAuthTestSuite(
    authConfig,
    yourHandler,
    mockAuthSession,
    mockHasPermission,
    setupMocks,
  );

  authTestSuite.forEach(({ description, runTest }) => {
    it(description, runTest);
  });
});
```

#### What Tests Are Generated

The `createAuthTestSuite()` function automatically generates the following test cases:

1. **Unauthenticated test**: Tests that unauthenticated requests return 401
2. **Insufficient privilege tests**: Tests that users with insufficient privileges return 403
3. **Successful authentication test**: Tests that users with proper privileges succeed

#### Benefits

- **Consistency**: All endpoints test authentication the same way
- **Completeness**: Automatically tests all privilege levels
- **Maintainability**: Changes to authentication logic only need to be updated in one place
- **Reduced duplication**: Eliminates repetitive authentication test code

## Best Practices

### 1. Test Isolation

- Each test is independent
- Clean up mocks between tests
- Use `beforeEach` for common setup

### 2. Descriptive Test Names

- Use clear, descriptive test names
- Follow the pattern: "should [expected behavior] when [condition]"
- Group related tests with `describe` blocks

### 3. Comprehensive Coverage

- Test all code paths
- Include edge cases
- Test both success and failure scenarios

### 4. Mock Management

- Reset mocks between tests
- Use specific mock implementations
- Verify mock calls with expected arguments

### 5. Error Testing

- Test all error conditions
- Verify error messages and status codes
- Test exception handling

## Committee API Endpoints Tested

### 1. GET /api/fetchCommitteeList

- **Purpose**: Retrieve committee members for a specific district
- **Authentication**: Admin privileges required
- **Test Coverage**:
  - Valid requests with proper parameters
  - Missing/invalid parameters
  - Committee not found scenarios
  - Database errors
  - Authentication failures

### 2. POST /api/committee/add

- **Purpose**: Add a member to a committee
- **Authentication**: Admin privileges required
- **Test Coverage**:
  - Successful member addition
  - Creating new committees
  - Validation errors
  - Authentication failures
  - Database errors

### 3. POST /api/committee/remove

- **Purpose**: Remove a member from a committee
- **Authentication**: Admin privileges required
- **Test Coverage**:
  - Successful member removal
  - Committee not found
  - Validation errors
  - Authentication failures
  - Database errors

### 4. POST /api/committee/requestAdd

- **Purpose**: Create a request to add/remove committee members
- **Authentication**: Request access privileges required
- **Test Coverage**:
  - Add member requests
  - Remove member requests
  - Combined add/remove requests
  - Validation errors
  - Authentication failures
  - Database errors

## Future Test Additions

When adding tests for additional endpoints, follow these patterns:

1. Create test file in appropriate directory structure
2. Import and mock all dependencies
3. Create comprehensive test cases covering all scenarios
4. Use existing test utilities and helpers
5. Follow the established naming conventions
6. Ensure proper cleanup and isolation

## Troubleshooting

### Common Issues

1. **Mock not working**: Ensure mocks are defined before imports
2. **Type errors**: Use proper TypeScript types in test files
3. **Async/await issues**: Always await async operations in tests
4. **Database connection**: Tests use mocked Prisma, no real DB needed

### Debug Tips

- Use `console.log` to debug test data
- Check mock call arguments with `toHaveBeenCalledWith`
- Verify response structure matches expected format
- Ensure all promises are properly awaited
