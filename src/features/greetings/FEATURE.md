# Greetings Feature

**Purpose:** Simple "Hello World" feature to demonstrate full-stack integration

**Scope:** Read-only API endpoint that returns greetings in multiple languages

## API Endpoints

### GET /api/greetings

**Description:** Returns a list of greetings in different languages

**Authentication:** None (public endpoint)

**Request:**
```http
GET /api/greetings HTTP/1.1
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "message": "Hello, World!",
      "language": "en",
      "createdAt": "2025-11-16T12:00:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "message": "Hola, Mundo!",
      "language": "es",
      "createdAt": "2025-11-16T12:00:00.000Z"
    }
  ]
}
```

## Files

- `greetings.route.ts` - HTTP route handler
- `greetings.service.ts` - Business logic (returns hardcoded greetings)
- `greetings.types.ts` - Type definitions (re-exports from shared-types)
- `FEATURE.md` - This file

## Dependencies

### Internal
- `@vertical-vibing/shared-types` - Shared TypeScript types

### External
- `express` - HTTP server

## Business Rules

1. Greetings are hardcoded (no database)
2. Four languages supported: English, Spanish, French, German
3. Public endpoint (no authentication required)

## Testing

```bash
# Unit test
npm test features/greetings

# Manual test
curl http://localhost:3000/api/greetings
```

## Future Enhancements

- Add more languages
- Store greetings in database
- Add POST endpoint to create custom greetings
- Add language filtering via query param
