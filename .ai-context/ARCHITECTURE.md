# Architecture Overview

**Last Updated:** 2025-11-16
**Architecture Pattern:** Vertical Slice Architecture (VSA) with LCMP Lite

## Core Principles

### 1. Feature Independence
Each feature is a self-contained vertical slice with all necessary code:
- Routes (HTTP endpoints)
- Services (business logic)
- Repositories (data access)
- Validators (input validation)
- Types (TypeScript definitions)

### 2. Centralized Infrastructure
Shared concerns live in `src/shared/`:
- **Database:** Drizzle schemas, migrations, base repository
- **Middleware:** Error handling, validation, logging
- **Utilities:** Response helpers, common types

### 3. AI Context Management
Every feature has a `FEATURE.md` file that provides:
- Purpose and scope
- API documentation
- Dependencies (internal and external)
- Key files and their roles
- Business rules
- AI-specific context notes

## Directory Structure

```
src/
├── features/              # All features (vertical slices)
│   ├── user-registration/ # Feature: User Registration
│   │   ├── FEATURE.md    # AI context anchor
│   │   ├── *.route.ts    # HTTP endpoints
│   │   ├── *.service.ts  # Business logic
│   │   ├── *.repository.ts # Data access
│   │   ├── *.validator.ts  # Validation schemas
│   │   └── *.types.ts      # Type definitions
│   ├── product-catalog/
│       └── ...
├── shared/                # Shared infrastructure
│   ├── db/
│   │   ├── schema/       # Drizzle schemas (single source of truth)
│   │   ├── migrations/
│   │   ├── repositories/
│   │   └── client.ts
│   ├── middleware/
│   ├── utils/
│   └── types/
├── app.ts                 # Express app setup
└── server.ts              # Server entry point
```

## Technology Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Validation:** Zod
- **Testing:** Vitest

## Data Flow

```
HTTP Request
    ↓
Route Handler (*.route.ts)
    ↓
Validator (Zod schema)
    ↓
Service (*.service.ts)
    ↓
Repository (*.repository.ts)
    ↓
Database (PostgreSQL via Drizzle)
    ↓
Response
```

## Key Decisions

### Why Vertical Slice Architecture?

1. **AI Context Isolation:** Each feature is a complete "context unit" for AI coding assistants
2. **Feature Independence:** Changes to one feature don't affect others
3. **Simplicity:** Flat hierarchy, easy to navigate
4. **Parallel Development:** Multiple features can be built simultaneously

### Why Centralized Drizzle Schemas?

1. **Type Safety:** Single source of truth for database types
2. **No Version Conflicts:** One `drizzle-orm` installation
3. **Migration Management:** Single location for all migrations
4. **Consistency:** Features import from one place

### Why Factory Functions for Routers?

```typescript
export function createProductsRouter(db: Database): Router {
  // ...
}
```

**Benefits:**
- Dependency injection (testable)
- No global state
- Explicit dependencies
- Easy to mock in tests

## File Naming Conventions

| Pattern | Purpose | Example |
|---------|---------|---------|
| `*.route.ts` | HTTP route handlers | `register.route.ts` |
| `*.service.ts` | Business logic | `register.service.ts` |
| `*.repository.ts` | Data access | `users.repository.ts` |
| `*.validator.ts` | Zod validation schemas | `register.validator.ts` |
| `*.types.ts` | TypeScript types | `register.types.ts` |
| `*.test.ts` | Unit/integration tests | `register.service.test.ts` |
| `FEATURE.md` | Feature documentation | Always `FEATURE.md` |

## Adding a New Feature

1. Create feature directory: `src/features/my-feature/`
2. Copy `FEATURE.md` template from `.ai-context/FEATURE-TEMPLATE.md`
3. Create necessary files following naming conventions
4. Add route to `src/app.ts`
5. Write tests in `__tests__/` directory
6. Update `.ai-context/DEPENDENCIES.md` if feature depends on others

## Evolution Path

When a feature becomes complex (e.g., multi-step workflows, complex domain logic):

1. Keep the feature folder
2. Add DDD layers **inside** that feature:
   ```
   src/features/billing/
   ├── FEATURE.md
   ├── domain/
   │   ├── entities/
   │   └── value-objects/
   ├── application/
   │   └── use-cases/
   ├── infrastructure/
   │   └── repositories/
   └── presentation/
       └── routes/
   ```

This hybrid approach keeps 80% of features simple while allowing 20% to use DDD when needed.

## Best Practices

### Do's ✅
- Always create a `FEATURE.md` for new features
- Use Zod for all input validation
- Keep features independent (low coupling)
- Use factory functions for routers (dependency injection)
- Write tests for business logic
- Document business rules in `FEATURE.md`

### Don'ts ❌
- Don't create cross-feature dependencies
- Don't duplicate database schemas
- Don't install `drizzle-orm` anywhere except `shared/db`
- Don't skip error handling
- Don't store passwords in plain text
- Don't hardcode configuration (use environment variables)

## Security Considerations

1. **Input Validation:** All inputs validated with Zod
2. **Error Handling:** No sensitive data in error responses (production)
3. **Database:** Use parameterized queries (Drizzle handles this)
4. **Authentication:** JWT tokens (to be implemented)
5. **Rate Limiting:** Should be added for production

## Performance Considerations

1. **Database Connections:** Connection pooling via `postgres` client
2. **Pagination:** Always paginate large datasets
3. **Indexing:** Add database indexes for frequently queried columns
4. **Caching:** Consider Redis for frequently accessed data

## Future Architecture Decisions

Document major architecture decisions in `.ai-context/decisions/` with format:
- `001-decision-title.md`
- `002-decision-title.md`
- etc.

Each decision document should include:
- **Context:** Why this decision was needed
- **Decision:** What was decided
- **Alternatives:** What else was considered
- **Consequences:** Trade-offs and implications
