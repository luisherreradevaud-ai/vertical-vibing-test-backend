# Auth Feature

## Overview

The Auth feature handles user authentication and registration for the Vertical Vibing application.

## Purpose

Provides secure user authentication with JWT tokens, including:
- User registration with email/password
- User login with credential verification
- Password hashing with bcrypt
- JWT token generation for authenticated sessions

## Structure

This feature follows the Vertical Slice Architecture (VSA) pattern:

```
src/features/auth/
├── auth.types.ts      # Type definitions (re-exports from shared-types)
├── auth.service.ts    # Business logic for auth operations
├── auth.validator.ts  # Validation middleware using Zod
├── auth.route.ts      # Express routes and handlers
└── FEATURE.md         # This file
```

## API Endpoints

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "avatarUrl": null,
      "createdAt": "2025-11-16T...",
      "updatedAt": "2025-11-16T..."
    },
    "token": "jwt.token.here"
  }
}
```

**Error Response (409 - Email exists):**
```json
{
  "status": "error",
  "code": "ERR_RESOURCE_002",
  "message": "Email already registered"
}
```

### POST /api/auth/login

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "avatarUrl": null,
      "createdAt": "2025-11-16T...",
      "updatedAt": "2025-11-16T..."
    },
    "token": "jwt.token.here"
  }
}
```

**Error Response (401 - Invalid credentials):**
```json
{
  "status": "error",
  "code": "ERR_AUTH_001",
  "message": "Invalid credentials"
}
```

## Dependencies

### Internal
- `@vertical-vibing/shared-types` - Type definitions and Zod schemas
- `shared/db/client` - Database client
- `shared/db/repositories/users.repository` - User data access
- `shared/utils/password` - Password hashing utilities
- `shared/utils/jwt` - JWT token utilities
- `shared/utils/response` - Standardized API responses

### External
- `express` - Web framework
- `zod` - Schema validation
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT tokens

## Usage

### Mounting the Router

```typescript
import { createAuthRouter } from './features/auth/auth.route';

app.use('/api/auth', createAuthRouter());
```

### Using JWT Middleware

```typescript
import { authenticateJWT } from './shared/middleware/auth';

router.get('/protected', authenticateJWT, (req, res) => {
  // req.user is available here
  const userId = req.user.userId;
});
```

## Security

- Passwords are hashed using bcrypt with 10 salt rounds
- JWT tokens expire after 7 days
- Sensitive data (password_hash) is never returned in API responses
- Email addresses are case-insensitive and normalized to lowercase

## Future Enhancements

- Email verification
- Password reset flow
- OAuth integration (Google, GitHub, etc.)
- Two-factor authentication
- Session management and token refresh
- Rate limiting on auth endpoints
