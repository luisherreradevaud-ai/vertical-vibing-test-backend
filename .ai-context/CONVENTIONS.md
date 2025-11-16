# Coding Conventions

**Purpose:** Standard coding practices for consistency and AI comprehension

## TypeScript Standards

### Strict Mode
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

### Type Exports
Always export types from files:
```typescript
// Good
export interface User {
  id: string;
  email: string;
}

export type UserRole = 'admin' | 'user';

// Bad - no exports
interface User { ... }
```

### Type Imports
Use `type` keyword for type-only imports:
```typescript
import type { User } from './user.types.js';
import type { Database } from '../shared/db/client.js';
```

## File Organization

### Feature File Structure
Every feature must have:
```
feature-name/
├── FEATURE.md           # Required - AI context
├── feature.route.ts     # Required - HTTP endpoints
├── feature.service.ts   # Required - Business logic
├── feature.repository.ts # Required if DB access needed
├── feature.validator.ts # Required - Zod schemas
├── feature.types.ts     # Required - TypeScript types
└── __tests__/          # Recommended - Tests
```

### Import Order
```typescript
// 1. Node.js built-ins
import { randomBytes } from 'crypto';

// 2. External packages
import { Router } from 'express';
import { z } from 'zod';

// 3. Shared utilities
import { validateBody } from '../../shared/middleware/validation.js';
import { ApiResponse } from '../../shared/utils/response.js';

// 4. Feature-specific imports
import { RegisterService } from './register.service.js';
import type { RegisterInput } from './register.validator.js';
```

## Naming Conventions

### Files
- **Routes:** `feature-name.route.ts` or `action.route.ts`
- **Services:** `feature-name.service.ts`
- **Repositories:** `entity.repository.ts` (e.g., `users.repository.ts`)
- **Validators:** `feature-name.validator.ts`
- **Types:** `feature-name.types.ts`

### Variables & Functions
```typescript
// camelCase for variables and functions
const userEmail = 'user@example.com';
function createUser() { }

// PascalCase for classes and types
class UserService { }
interface UserProfile { }
type UserRole = 'admin' | 'user';

// UPPER_CASE for constants
const MAX_LOGIN_ATTEMPTS = 5;
const DEFAULT_PAGE_SIZE = 20;
```

### Database
- **Tables:** Plural, lowercase (e.g., `users`, `products`)
- **Columns:** snake_case (e.g., `first_name`, `is_active`)
- **Schemas:** Export as singular (e.g., `export const users = pgTable(...)`)

## Code Style

### Function Length
- Keep functions under 50 lines
- Extract complex logic into separate functions
- Use descriptive function names

### Error Handling
```typescript
// Good - Use AppError for operational errors
if (!user) {
  throw new AppError(404, 'User not found');
}

// Good - Use asyncHandler for routes
router.post('/register', asyncHandler(async (req, res) => {
  // ...
}));

// Bad - Silent failures
if (!user) {
  return null; // Don't do this
}
```

### Comments

#### JSDoc for Public APIs
```typescript
/**
 * Register a new user
 *
 * @param input - User registration data
 * @returns Created user without password
 * @throws AppError if email already exists
 */
async registerUser(input: RegisterInput): Promise<UserWithoutPassword> {
  // ...
}
```

#### Inline Comments for Complex Logic
```typescript
// Generate verification token (32 bytes = 64 hex characters)
const token = randomBytes(32).toString('hex');
```

#### AI Context Comments
```typescript
/**
 * @context This repository extends BaseRepository for common CRUD operations.
 * Feature-specific queries (like findByEmail) are added here.
 */
export class UsersRepository extends BaseRepository<typeof users> {
  // ...
}
```

## Validation

### Always Use Zod
```typescript
// Define schema
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Infer TypeScript type
export type RegisterInput = z.infer<typeof registerSchema>;
```

### Validation Middleware
```typescript
// Use validation middleware in routes
router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    // req.body is now typed and validated
  })
);
```

## Database Access

### Repository Pattern
```typescript
// Good - Use repository for data access
class UsersRepository extends BaseRepository<typeof users> {
  async findByEmail(email: string) {
    return this.db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }
}

// Bad - Direct DB access in service
class RegisterService {
  async registerUser(input) {
    const user = await db.select().from(users).where(...); // Don't do this
  }
}
```

### Query Builders
```typescript
// Use Drizzle's query builder
const users = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, email))
  .limit(1);

// Or use query API
const user = await db.query.users.findFirst({
  where: eq(users.email, email),
});
```

## Testing

### Test File Naming
```typescript
// Unit tests
register.service.test.ts

// Integration tests
register.route.test.ts
```

### Test Structure
```typescript
import { describe, it, expect } from 'vitest';

describe('RegisterService', () => {
  describe('registerUser', () => {
    it('should create a new user with valid input', async () => {
      // Arrange
      const input = { email: 'test@example.com', password: 'password123' };

      // Act
      const user = await service.registerUser(input);

      // Assert
      expect(user.email).toBe('test@example.com');
      expect(user.isEmailVerified).toBe(false);
    });

    it('should throw AppError if email already exists', async () => {
      // ...
    });
  });
});
```

## Environment Variables

### Naming
```bash
# UPPER_CASE with underscores
DATABASE_URL=postgresql://...
JWT_SECRET=...
NODE_ENV=development

# Group related variables
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
```

### Loading
```typescript
import * as dotenv from 'dotenv';
dotenv.config();

// Use with defaults
const port = process.env.PORT || 3000;
const dbUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/myapp';
```

## API Response Format

### Success Response
```typescript
{
  "status": "success",
  "data": { ... }
}
```

### Error Response
```typescript
{
  "status": "error",
  "message": "Error description",
  "errors": [ // Optional for validation errors
    { "field": "email", "message": "Invalid email" }
  ]
}
```

### Use ApiResponse Helper
```typescript
// Success
return ApiResponse.success(res, user);

// Created (201)
return ApiResponse.created(res, user);

// No content (204)
return ApiResponse.noContent(res);

// Error
return ApiResponse.error(res, 'Invalid input', 400);
```

## Git Commit Messages

### Format
```
type(scope): subject

body (optional)
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `test`: Test additions/changes
- `chore`: Build/tooling changes

### Examples
```
feat(user-registration): add email verification

fix(products): correct price validation regex

refactor(auth): extract token generation to separate function
```

## AI-Specific Best Practices

### 1. Explicit Types
```typescript
// Good - Explicit types help AI understand
function createUser(input: RegisterInput): Promise<User> { ... }

// Bad - Implicit types are unclear
function createUser(input) { ... }
```

### 2. Descriptive Names
```typescript
// Good
const emailVerificationToken = generateToken();

// Bad
const token = generateToken();
```

### 3. Context Comments
```typescript
/**
 * @feature UserRegistration
 * @depends users.repository, email.service
 */
export class RegisterService { ... }
```

### 4. FEATURE.md Updates
When modifying a feature, always update FEATURE.md if:
- API changes
- New dependencies added
- Business rules change
- New files added

## Code Review Checklist

Before committing:
- [ ] FEATURE.md is updated
- [ ] All functions have type annotations
- [ ] Input validation uses Zod
- [ ] Error handling is present
- [ ] Tests pass
- [ ] No hardcoded values (use env vars)
- [ ] Code follows naming conventions
- [ ] ESLint passes (no warnings)
