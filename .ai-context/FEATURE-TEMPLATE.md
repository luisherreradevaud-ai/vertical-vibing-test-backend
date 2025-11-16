# Feature: [Feature Name]

## Purpose
[Brief description of what this feature does]

## Scope
- [What is included]
- [What is included]
- [What is included]

## Out of Scope
- [What is explicitly NOT included]
- [Future enhancements]

## Dependencies

### Internal
- **Database:** [Tables used from `shared/db/schema/`]
- **Middleware:** [Middleware used]
- **Utilities:** [Shared utilities used]

### External
- [External npm packages]

## Public API

### [HTTP METHOD] /api/[endpoint]
[Description]

**Request Body/Query:**
```json
{
  "field": "value"
}
```

**Success Response ([STATUS CODE]):**
```json
{
  "status": "success",
  "data": { ... }
}
```

**Error Response ([STATUS CODE]):**
```json
{
  "status": "error",
  "message": "Error description"
}
```

## Key Files

| File | Purpose |
|------|---------|
| `[feature].route.ts` | [Description] |
| `[feature].service.ts` | [Description] |
| `[feature].repository.ts` | [Description] |
| `[feature].validator.ts` | [Description] |
| `[feature].types.ts` | [Description] |

## Data Flow

```
Request → Route → Validator → Service → Repository → Database
```

## Business Rules

1. **[Rule Name]:** [Description]
2. **[Rule Name]:** [Description]

## Security Considerations

- [Security concern and mitigation]
- [Security concern and mitigation]

## Testing Strategy

- [Test type]: [What to test]
- [Test type]: [What to test]

## AI Context Notes

**Self-Contained Feature:** [Yes/No - list dependencies if any]

**When modifying:**
- [Important notes for future modifications]
- [Common gotchas]

**Common Tasks:**
- [Task] → [Which file to modify]
- [Task] → [Which file to modify]

## Future Enhancements

- [ ] [Enhancement idea]
- [ ] [Enhancement idea]
