# Feature Dependencies

**Last Updated:** 2025-11-16

This document tracks dependencies between features to help AI understand the impact of changes.

## Dependency Graph

```
[Shared Infrastructure]
        ↓
    [Features]
        ↓
   (Independent)
```

## Feature Inventory

| Feature | Status | Dependencies | Provides |
|---------|--------|--------------|----------|
| `user-registration` | ✅ Complete | `shared/db`, `shared/middleware` | User accounts |
| `product-catalog` | ✅ Complete | `shared/db`, `shared/middleware` | Product CRUD |

## Shared Infrastructure

### Database (`shared/db`)
**Used By:** All features requiring database access

**Exports:**
- `schema/users.schema.ts` → users table types
- `schema/products.schema.ts` → products table types
- `client.ts` → Database instance
- `repositories/base.repository.ts` → Generic CRUD operations

**Impact:** Changes to schemas affect all dependent features

### Middleware (`shared/middleware`)
**Used By:** All features with HTTP endpoints

**Exports:**
- `error-handler.ts` → AppError, errorHandler, asyncHandler
- `validation.ts` → validateBody, validateQuery, validateParams

**Impact:** Changes to middleware affect all routes

### Utilities (`shared/utils`)
**Used By:** All features

**Exports:**
- `response.ts` → ApiResponse helper
- Types (`common.types.ts`)

**Impact:** Low - utility changes rarely break features

## Inter-Feature Dependencies

### Current State: Zero Dependencies ✅

**user-registration** does NOT depend on any other feature
**product-catalog** does NOT depend on any other feature

This is intentional - Vertical Slice Architecture minimizes coupling.

### Future Potential Dependencies

When adding new features, document dependencies here:

**Example:**
```
order-processing → Depends on:
  - user-registration (requires User ID)
  - product-catalog (requires Product ID)
```

## External Dependencies

### Production Dependencies
```json
{
  "express": "HTTP framework",
  "drizzle-orm": "Database ORM",
  "postgres": "PostgreSQL client",
  "zod": "Validation library",
  "dotenv": "Environment variables",
  "helmet": "Security middleware",
  "cors": "CORS middleware",
  "compression": "Response compression",
  "morgan": "HTTP logging"
}
```

### Development Dependencies
```json
{
  "typescript": "Type system",
  "tsx": "TypeScript executor",
  "drizzle-kit": "Schema migrations",
  "vitest": "Testing framework",
  "supertest": "API testing",
  "eslint": "Code linting",
  "prettier": "Code formatting"
}
```

## Impact Analysis

### Adding a New Feature
**Impact:** None (if following VSA pattern)

**Steps:**
1. Create feature directory
2. Implement using shared infrastructure
3. Register router in `app.ts`
4. Update this document

### Modifying Shared Infrastructure
**Impact:** ALL features

**Checklist:**
- [ ] Test all existing features
- [ ] Update ARCHITECTURE.md
- [ ] Update CONVENTIONS.md
- [ ] Notify team of breaking changes

### Modifying a Feature
**Impact:** Only that feature (if no cross-dependencies)

**Checklist:**
- [ ] Update FEATURE.md
- [ ] Run feature tests
- [ ] Check for accidental coupling

## Dependency Rules

### Do's ✅
- Features can depend on `shared/` infrastructure
- Features can depend on external packages
- Document all dependencies in FEATURE.md

### Don'ts ❌
- Features must NOT import from other features
- Features must NOT share state
- Features must NOT directly access other features' repositories

### Exception: Shared Domain Entities

If two features need to share a domain concept (e.g., User, Product), options:

1. **Option A: Separate Features (Recommended)**
   - Keep features independent
   - Accept slight duplication

2. **Option B: Shared Domain Package**
   - Extract to `shared/domain/user/`
   - Both features import from shared location
   - Document in this file

## Monitoring Dependencies

### Static Analysis
Use `madge` to detect circular dependencies:

```bash
npx madge --circular src/
```

### Import Rules (ESLint)
```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          "../features/*" // Features cannot import other features
        ]
      }
    ]
  }
}
```

## Refactoring Guide

### When to Extract Shared Logic

Extract to `shared/` when:
- Logic is used by 3+ features
- Logic is stable (not changing frequently)
- Logic has no feature-specific concerns

**Example:**
```
// Started in feature
src/features/user-registration/utils/hash-password.ts

// Used by 3 features → Extract
src/shared/utils/hash-password.ts
```

### When to Keep Duplicated

Keep duplicated when:
- Only 2 features use it
- Logic is feature-specific
- Coupling would reduce flexibility

**Philosophy:** Prefer duplication over wrong abstraction
