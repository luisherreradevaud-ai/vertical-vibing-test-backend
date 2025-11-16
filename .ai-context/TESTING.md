# Testing Standards

**Purpose:** Comprehensive testing strategy ensuring code quality, preventing regressions, and documenting behavior.

**Philosophy:** Write tests that provide value, not just coverage numbers.

---

## Coverage Requirements (STRICT)

| Code Type | Minimum Coverage | Target |
|-----------|------------------|--------|
| Services (business logic) | 90% | 95% |
| Repositories | 80% | 90% |
| Routes (integration) | 70% | 80% |
| Utilities (pure functions) | 95% | 100% |
| **Overall Project** | **80%** | **85%** |

**Check coverage:**
```bash
pnpm test:coverage
```

---

## Test Types

### Unit Tests (70% of all tests)

**What:** Test individual functions/methods in isolation

**When:** Testing services, utilities, validators

**Characteristics:**
- Fast (< 10ms per test)
- Isolated (no database, no network)
- Mocked dependencies

**Example:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { RegisterService } from '../register.service';

describe('RegisterService', () => {
  describe('registerUser', () => {
    it('should create user when email does not exist', async () => {
      // Arrange
      const mockRepository = {
        emailExists: vi.fn().mockResolvedValue(false),
        createUser: vi.fn().mockResolvedValue({ id: '123', email: 'test@example.com' })
      };
      const service = new RegisterService(mockRepository as any);

      // Act
      const result = await service.registerUser({
        email: 'test@example.com',
        password: 'password123'
      });

      // Assert
      expect(result.email).toBe('test@example.com');
      expect(mockRepository.emailExists).toHaveBeenCalledWith('test@example.com');
      expect(mockRepository.createUser).toHaveBeenCalled();
    });
  });
});
```

---

### Integration Tests (25% of all tests)

**What:** Test multiple components together (route + service + repository + database)

**When:** Testing API endpoints

**Characteristics:**
- Slower (100-500ms per test)
- Uses test database
- Tests full request/response cycle

**Example:**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { setupTestDatabase, teardownTestDatabase } from './helpers/database';

describe('POST /api/users/register', () => {
  let app: Express;

  beforeAll(async () => {
    await setupTestDatabase();
    app = createApp();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should create user with valid data', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123',
        firstName: 'John'
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      status: 'success',
      data: {
        email: 'test@example.com',
        firstName: 'John',
        isEmailVerified: false
      }
    });
    expect(response.body.data).not.toHaveProperty('passwordHash');
  });

  it('should return 409 when email exists', async () => {
    // First registration
    await request(app)
      .post('/api/users/register')
      .send({ email: 'exists@example.com', password: 'pass123' });

    // Second registration with same email
    const response = await request(app)
      .post('/api/users/register')
      .send({ email: 'exists@example.com', password: 'pass123' });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      status: 'error',
      code: 'ERR_RESOURCE_002',
      message: 'User already exists'
    });
  });
});
```

---

### E2E Tests (5% of all tests, optional)

**What:** Test complete user workflows

**When:** Critical business flows only

**Characteristics:**
- Very slow (seconds per test)
- Tests multiple endpoints in sequence
- Uses real or near-real environment

**Example:**
```typescript
describe('User Registration Flow', () => {
  it('should complete full registration and login flow', async () => {
    // 1. Register
    const registerResponse = await request(app)
      .post('/api/users/register')
      .send({ email: 'flow@example.com', password: 'pass123' });

    const userId = registerResponse.body.data.id;

    // 2. Verify email (simulate)
    await request(app)
      .post(`/api/users/${userId}/verify-email`)
      .send({ token: 'verification-token' });

    // 3. Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'flow@example.com', password: 'pass123' });

    expect(loginResponse.body.data).toHaveProperty('token');
  });
});
```

---

## Test Structure (AAA Pattern)

### Arrange-Act-Assert

**ALWAYS use this pattern:**

```typescript
it('should do something when condition', async () => {
  // Arrange - Set up test data and mocks
  const input = { email: 'test@example.com' };
  const expectedOutput = { id: '123', email: 'test@example.com' };

  // Act - Execute the function under test
  const result = await service.doSomething(input);

  // Assert - Verify the result
  expect(result).toEqual(expectedOutput);
});
```

**Bad example (unclear):**
```typescript
it('test user creation', async () => {
  const result = await service.createUser({ email: 'test@example.com' });
  expect(result.email).toBe('test@example.com');
  const user = await repository.findById(result.id);
  expect(user).toBeDefined();
});
```

---

## Test Naming Conventions

### Test File Names

```
src/features/users/users.service.ts
src/features/users/__tests__/users.service.test.ts  ✅

src/features/users/users.service.spec.ts            ❌ Use .test.ts
src/features/users/tests/users.service.test.ts      ❌ Use __tests__/
```

### Test Description Format

```typescript
describe('[ClassName/FunctionName]', () => {
  describe('[methodName]', () => {
    it('should [expected behavior] when [condition]', async () => {
      // ...
    });
  });
});
```

**Examples:**
```typescript
// ✅ Good - Descriptive
it('should throw AppError when email already exists')
it('should return empty array when no products found')
it('should hash password before saving')

// ❌ Bad - Vague
it('works')
it('creates user')
it('test error')
```

---

## What to Test

### ✅ MUST Test

1. **Business Logic**
   ```typescript
   it('should apply 10% discount for premium users', () => {
     const price = calculatePrice(100, 'premium');
     expect(price).toBe(90);
   });
   ```

2. **Validation Logic**
   ```typescript
   it('should reject invalid email format', () => {
     expect(() => validateEmail('invalid')).toThrow();
   });
   ```

3. **Error Handling**
   ```typescript
   it('should throw AppError when user not found', async () => {
     await expect(service.getUser('nonexistent'))
       .rejects
       .toThrow(AppError);
   });
   ```

4. **Edge Cases**
   ```typescript
   it('should handle null input', () => { ... });
   it('should handle empty array', () => { ... });
   it('should handle maximum integer value', () => { ... });
   ```

5. **Database Operations (Integration)**
   ```typescript
   it('should create user in database', async () => {
     const user = await repository.create({ email: 'test@example.com' });
     const found = await repository.findById(user.id);
     expect(found).toBeDefined();
   });
   ```

### ⚠️ SHOULD Test

1. **Complex Algorithms**
2. **Data Transformations**
3. **API Endpoint Behavior**
4. **Authentication/Authorization Logic**

### ❌ DON'T Test

1. **Third-Party Libraries**
   ```typescript
   // ❌ Don't test Zod
   it('should validate with zod', () => {
     const result = schema.parse({ email: 'test@example.com' });
     expect(result).toBeDefined();
   });
   ```

2. **TypeScript Type Checking**
   ```typescript
   // ❌ Don't test types (TypeScript does this)
   it('should have correct types', () => {
     const user: User = { id: '123' };
     expect(typeof user.id).toBe('string');
   });
   ```

3. **Framework Internals**
   ```typescript
   // ❌ Don't test Express
   it('should create express router', () => {
     const router = Router();
     expect(router).toBeDefined();
   });
   ```

4. **Trivial Getters/Setters**
   ```typescript
   // ❌ Don't test trivial methods
   it('should get email', () => {
     const user = new User('test@example.com');
     expect(user.getEmail()).toBe('test@example.com');
   });
   ```

---

## Mocking Strategies

### When to Mock

**Mock external dependencies:**
- Database (in unit tests)
- External APIs
- File system
- Date/time (for consistency)
- Random number generation

**Don't mock:**
- Code under test
- Pure utility functions
- Simple data structures

### Mock Repository (Unit Tests)

```typescript
import { vi } from 'vitest';

const mockRepository = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
};

// Configure mock
mockRepository.findById.mockResolvedValue({ id: '123', email: 'test@example.com' });

// Use in test
const service = new UserService(mockRepository as any);
```

### Mock Date/Time

```typescript
import { vi } from 'vitest';

// Mock Date.now()
const now = new Date('2025-11-16T12:00:00.000Z');
vi.setSystemTime(now);

// Test code that uses Date.now()
const result = service.doSomethingWithDate();

// Restore
vi.useRealTimers();
```

### Mock External API

```typescript
import { vi } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

(fetch as any).mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'response' })
});
```

---

## Test Database Setup

### Test Database Configuration

```typescript
// test/helpers/database.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ||
  'postgresql://localhost:5432/test_db';

export async function setupTestDatabase() {
  const client = postgres(TEST_DATABASE_URL);
  const db = drizzle(client);

  // Run migrations
  await migrate(db, { migrationsFolder: './src/shared/db/migrations' });

  return db;
}

export async function teardownTestDatabase() {
  // Clean up test data
  const client = postgres(TEST_DATABASE_URL);
  await client.end();
}

export async function resetTestDatabase() {
  // Truncate all tables
  const client = postgres(TEST_DATABASE_URL);
  await client`TRUNCATE TABLE users, products CASCADE`;
}
```

### Use in Tests

```typescript
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, resetTestDatabase } from './helpers/database';

beforeAll(async () => {
  await setupTestDatabase();
});

beforeEach(async () => {
  await resetTestDatabase();  // Clean state for each test
});

afterAll(async () => {
  await teardownTestDatabase();
});
```

---

## Test Data Factories

Create reusable test data:

```typescript
// test/factories/user.factory.ts
import { faker } from '@faker-js/faker';

export function createUserData(overrides = {}) {
  return {
    email: faker.internet.email(),
    password: 'SecurePassword123',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    ...overrides
  };
}

// Usage
it('should create user', async () => {
  const userData = createUserData({ email: 'specific@example.com' });
  const user = await service.register(userData);
  expect(user.email).toBe('specific@example.com');
});
```

---

## Assertions

### Common Assertions

```typescript
// Equality
expect(value).toBe(expected);           // Primitive values
expect(value).toEqual(expected);        // Objects/arrays (deep equality)
expect(value).toStrictEqual(expected);  // Strict equality (checks undefined)

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(0);
expect(value).toBeLessThan(100);
expect(value).toBeCloseTo(0.3, 2);  // Floating point

// Strings
expect(string).toContain('substring');
expect(string).toMatch(/regex/);

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toMatchObject({ key: 'value' });  // Partial match

// Errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(AppError);
expect(() => fn()).toThrow('Error message');

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow(Error);
```

### Custom Matchers

```typescript
// Extend expect
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      pass,
      message: () => `expected ${received} to be a valid UUID`
    };
  }
});

// Usage
expect(user.id).toBeValidUUID();
```

---

## Test Organization

### Group Related Tests

```typescript
describe('UserService', () => {
  describe('registerUser', () => {
    it('should create user with valid data', () => { ... });
    it('should throw error when email exists', () => { ... });
    it('should hash password', () => { ... });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', () => { ... });
    it('should throw error with invalid token', () => { ... });
  });
});
```

### Setup/Teardown

```typescript
describe('ProductService', () => {
  let service: ProductService;
  let mockRepository: any;

  beforeEach(() => {
    // Run before each test
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn()
    };
    service = new ProductService(mockRepository);
  });

  afterEach(() => {
    // Run after each test
    vi.clearAllMocks();
  });

  it('should ...', () => { ... });
});
```

---

## Running Tests

### Commands

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test -- --watch

# Run specific file
pnpm test src/features/users/__tests__/users.service.test.ts

# Run tests matching pattern
pnpm test -- --grep "should create user"

# Run only changed tests
pnpm test -- --changed

# Run with UI
pnpm test -- --ui
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_PASSWORD: password
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: pnpm install
      - run: pnpm build
      - run: pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Test-Driven Development (TDD)

### Red-Green-Refactor

1. **Red:** Write a failing test
2. **Green:** Write minimal code to make it pass
3. **Refactor:** Improve code while keeping tests green

**Example:**
```typescript
// 1. RED - Write test first
it('should calculate discount for premium users', () => {
  const price = calculateDiscount(100, 'premium');
  expect(price).toBe(90);  // FAILS - function doesn't exist
});

// 2. GREEN - Implement minimal solution
function calculateDiscount(price: number, tier: string): number {
  if (tier === 'premium') return price * 0.9;
  return price;
}
// TEST PASSES

// 3. REFACTOR - Improve code
function calculateDiscount(price: number, tier: UserTier): number {
  const discounts: Record<UserTier, number> = {
    premium: 0.9,
    standard: 1.0
  };
  return price * discounts[tier];
}
// TEST STILL PASSES
```

---

## Common Testing Patterns

### Testing Async Code

```typescript
// ✅ Good - Use async/await
it('should create user', async () => {
  const user = await service.createUser(data);
  expect(user).toBeDefined();
});

// ❌ Bad - Forgot await (test passes incorrectly)
it('should create user', () => {
  const user = service.createUser(data);
  expect(user).toBeDefined();  // user is a Promise!
});
```

### Testing Errors

```typescript
// ✅ Good - Test specific error
it('should throw AppError with code ERR_RESOURCE_001', async () => {
  await expect(service.getUser('invalid'))
    .rejects
    .toThrow(new AppError(404, 'User not found', 'ERR_RESOURCE_001'));
});

// Alternatively
it('should throw AppError', async () => {
  try {
    await service.getUser('invalid');
    fail('Should have thrown error');
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('ERR_RESOURCE_001');
  }
});
```

### Testing Side Effects

```typescript
it('should send email after user registration', async () => {
  const sendEmailSpy = vi.spyOn(emailService, 'send');

  await service.registerUser(userData);

  expect(sendEmailSpy).toHaveBeenCalledWith({
    to: userData.email,
    subject: 'Welcome!',
    body: expect.stringContaining('verify')
  });
});
```

---

## Test Coverage Reports

```bash
# Generate coverage report
pnpm test:coverage

# Open HTML report
open coverage/index.html
```

**Interpret results:**
- **Statements:** % of code statements executed
- **Branches:** % of conditional branches tested
- **Functions:** % of functions called
- **Lines:** % of lines executed

**Aim for:**
- > 80% overall
- > 90% for business logic
- 100% for critical paths

---

## Summary

**Test Types:**
- Unit tests: 70% (fast, isolated)
- Integration tests: 25% (API endpoints)
- E2E tests: 5% (critical flows only)

**Coverage Targets:**
- Services: 90%+
- Overall: 80%+

**AAA Pattern:**
- Arrange (setup)
- Act (execute)
- Assert (verify)

**What to Test:**
- ✅ Business logic
- ✅ Error handling
- ✅ Edge cases
- ❌ Framework internals
- ❌ Type checking

**Remember:** Tests are documentation. Write tests that explain what the code does and why.
