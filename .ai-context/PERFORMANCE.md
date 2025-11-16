# Performance Standards

**Purpose:** Clear performance budgets and optimization guidelines to prevent premature optimization while ensuring acceptable performance.

**Philosophy:** Measure first, optimize only when needed.

---

## Performance Budgets

### Database Query Performance

| Query Type | Budget | Action if Exceeded |
|------------|--------|-------------------|
| Simple SELECT (single table) | < 10ms | Add index on queried column |
| SELECT with JOIN (2 tables) | < 50ms | Optimize query or add indexes |
| Complex query (3+ joins) | < 100ms | Consider query redesign |
| INSERT/UPDATE/DELETE | < 20ms | Check indexes on FKs |
| Bulk operations | < 500ms | Consider batch processing |

**How to measure:**
```typescript
const start = Date.now();
const result = await db.query.users.findFirst({ ... });
const duration = Date.now() - start;
console.log(`Query took ${duration}ms`);
```

### API Endpoint Performance

| Endpoint Type | Budget | Action if Exceeded |
|--------------|--------|-------------------|
| GET (simple, no DB) | < 50ms | Profile code, check loops |
| GET (with DB query) | < 200ms | Optimize queries |
| POST/PUT (with DB write) | < 300ms | Check validation complexity |
| POST (file upload) | < 2s | Check file size limits |
| Batch operations | < 5s | Consider async processing |

**How to measure:**
```typescript
// Add middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug(`${req.method} ${req.path} - ${duration}ms`);
  });
  next();
});
```

### Memory Usage

| Operation | Budget | Action if Exceeded |
|-----------|--------|-------------------|
| Single request | < 50MB | Check for memory leaks |
| Cached data | < 100MB total | Implement LRU cache |
| File processing | < 500MB | Stream files instead |

---

## When to Optimize

### ✅ Optimize NOW If:

1. **Query exceeds budget**
   ```typescript
   // Query takes 150ms (budget: 100ms)
   → Add database index
   ```

2. **Endpoint returns > 1000 records without pagination**
   ```typescript
   // ❌ Bad
   const products = await db.select().from(products);  // Returns 10,000 items

   // ✅ Good
   const products = await db.select().from(products).limit(20);
   ```

3. **N+1 query detected**
   ```typescript
   // ❌ Bad - N+1 query
   const orders = await db.select().from(orders);
   for (const order of orders) {
     const user = await db.query.users.findFirst({
       where: eq(users.id, order.userId)
     });
     order.user = user;
   }

   // ✅ Good - Single query with join
   const ordersWithUsers = await db
     .select()
     .from(orders)
     .leftJoin(users, eq(orders.userId, users.id));
   ```

4. **No database index on frequently queried field**
   ```typescript
   // If querying by email often:
   const user = await db.query.users.findFirst({
     where: eq(users.email, email)  // This should have an index
   });

   // Add to schema:
   export const users = pgTable('users', {
     email: varchar('email').notNull().unique()  // .unique() creates index
   });
   ```

### ⚠️ Consider Optimizing If:

1. **Endpoint takes > 200ms consistently**
2. **Memory usage > 100MB for single operation**
3. **More than 3 database round-trips for one request**
4. **External API call takes > 1s**

### ❌ DON'T Optimize If:

1. **"It might be slow later"** (premature optimization)
2. **Current performance meets budgets**
3. **Optimization adds significant complexity**
4. **Feature used rarely (< 10 requests/day)**

---

## Optimization Patterns

### Database Optimization

#### 1. Add Indexes

**When:** Frequently queried columns

```typescript
// Schema definition
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),  // Index via unique
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  // Additional indexes
  emailIdx: index('email_idx').on(table.email),
  createdAtIdx: index('created_at_idx').on(table.createdAt)
}));
```

**Common indexes needed:**
- ✅ Primary keys (automatic)
- ✅ Foreign keys
- ✅ Unique constraints (automatic)
- ✅ Frequently filtered columns (status, isActive, etc.)
- ✅ Columns used in ORDER BY
- ⚠️ Large text fields (consider full-text search indexes)

#### 2. Optimize Queries

**Use `.select()` to limit fields:**
```typescript
// ❌ Bad - Fetches all columns
const users = await db.select().from(users);

// ✅ Good - Only needed fields
const users = await db
  .select({
    id: users.id,
    email: users.email,
    name: users.firstName
  })
  .from(users);
```

**Use appropriate JOIN type:**
```typescript
// INNER JOIN - when related record must exist
.innerJoin(users, eq(orders.userId, users.id))

// LEFT JOIN - when related record may not exist
.leftJoin(users, eq(orders.userId, users.id))
```

**Limit and offset:**
```typescript
// Always use pagination
await db
  .select()
  .from(products)
  .limit(20)
  .offset(0);
```

#### 3. Avoid N+1 Queries

**Problem:**
```typescript
// ❌ BAD - N+1 query (1 + N queries)
const orders = await db.select().from(orders);  // 1 query
for (const order of orders) {
  order.user = await db.query.users.findFirst({  // N queries
    where: eq(users.id, order.userId)
  });
}
```

**Solution 1: JOIN**
```typescript
// ✅ GOOD - Single query
const ordersWithUsers = await db
  .select({
    order: orders,
    user: users
  })
  .from(orders)
  .leftJoin(users, eq(orders.userId, users.id));
```

**Solution 2: Batch Loading**
```typescript
// ✅ GOOD - 2 queries instead of N+1
const orders = await db.select().from(orders);
const userIds = [...new Set(orders.map(o => o.userId))];
const usersMap = await db.query.users.findMany({
  where: inArray(users.id, userIds)
}).then(users => new Map(users.map(u => [u.id, u])));

orders.forEach(order => {
  order.user = usersMap.get(order.userId);
});
```

#### 4. Use Transactions Wisely

```typescript
// Use transaction for multi-step operations
await db.transaction(async (tx) => {
  await tx.insert(orders).values(order);
  await tx.update(products).set({ stock: stock - 1 });
});

// Don't use transaction for single operations
await db.insert(users).values(user);  // No transaction needed
```

---

### API Optimization

#### 1. Response Compression

```typescript
import compression from 'compression';
app.use(compression());  // Compresses responses
```

#### 2. Caching

**When to cache:**
- Data changes infrequently (< once per hour)
- Query is expensive (> 100ms)
- Hit frequently (> 100 requests/min)

**Example with in-memory cache:**
```typescript
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await expensiveOperation();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

**For production, use Redis:**
```typescript
import Redis from 'ioredis';
const redis = new Redis();

await redis.setex('key', 300, JSON.stringify(data));  // 5 min TTL
const cached = await redis.get('key');
```

#### 3. Pagination

**Always paginate lists:**
```typescript
// ✅ Good
router.get('/', validateQuery(listQuerySchema), async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const { data, total } = await service.list(limit, offset);
  return ApiResponse.paginated(res, data, total, limit, offset);
});
```

**Cursor-based for large datasets:**
```typescript
// For very large datasets, use cursor pagination
router.get('/', async (req, res) => {
  const { cursor, limit = 20 } = req.query;

  const products = await db
    .select()
    .from(products)
    .where(cursor ? gt(products.id, cursor) : undefined)
    .limit(limit)
    .orderBy(products.id);

  const nextCursor = products[products.length - 1]?.id;

  return res.json({
    data: products,
    nextCursor,
    hasMore: products.length === limit
  });
});
```

---

### Application Optimization

#### 1. Async/Await Properly

```typescript
// ❌ Bad - Sequential (slow)
const user = await getUser(id);
const orders = await getOrders(id);
const products = await getProducts();
// Total: 300ms

// ✅ Good - Parallel (fast)
const [user, orders, products] = await Promise.all([
  getUser(id),
  getOrders(id),
  getProducts()
]);
// Total: 100ms (max of the three)
```

#### 2. Avoid Blocking Operations

```typescript
// ❌ Bad - Synchronous file read blocks
const fs = require('fs');
const data = fs.readFileSync('file.txt');

// ✅ Good - Asynchronous
import { readFile } from 'fs/promises';
const data = await readFile('file.txt', 'utf8');

// ✅ Better - Stream for large files
import { createReadStream } from 'fs';
const stream = createReadStream('large-file.txt');
```

#### 3. Debounce/Throttle High-Frequency Operations

```typescript
// For operations that happen frequently
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Usage: debounce search API calls
const debouncedSearch = debounce(searchAPI, 300);
```

---

## Monitoring Performance

### Add Timing Middleware

```typescript
import { Request, Response, NextFunction } from 'express';

export function performanceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000; // Convert to ms

    // Log slow requests
    if (duration > 200) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        statusCode: res.statusCode
      });
    }

    // Add to response headers
    res.setHeader('X-Response-Time', `${duration}ms`);
  });

  next();
}
```

### Database Query Logging

```typescript
// Enable in development
const db = drizzle(client, {
  logger: {
    logQuery: (query, params) => {
      const start = Date.now();
      // Log query
      console.log('Query:', query);
      console.log('Duration:', Date.now() - start, 'ms');
    }
  }
});
```

### APM Tools (Production)

For production, use Application Performance Monitoring:
- **New Relic**
- **Datadog**
- **Dynatrace**
- **Elastic APM**

These automatically track:
- Endpoint response times
- Database query performance
- Error rates
- Memory usage

---

## Performance Testing

### Load Testing

```typescript
// Use tools like autocannon
import autocannon from 'autocannon';

const result = await autocannon({
  url: 'http://localhost:3000/api/products',
  connections: 10,
  duration: 30
});

console.log(result);
// Requests/sec: 1000
// Latency (avg): 10ms
```

### Benchmarking

```typescript
import { describe, it, bench } from 'vitest';

describe('Performance', () => {
  bench('expensive operation', async () => {
    await expensiveFunction();
  });
});
```

---

## Common Performance Issues

### Issue 1: N+1 Queries

**Symptom:** Many sequential database queries

**Detection:**
```typescript
// Enable query logging and count queries per request
```

**Fix:** Use JOINs or batch loading

---

### Issue 2: Missing Indexes

**Symptom:** Slow queries with WHERE clauses

**Detection:**
```sql
-- PostgreSQL: Check query execution plan
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
-- Look for "Seq Scan" (bad) vs "Index Scan" (good)
```

**Fix:** Add index to queried columns

---

### Issue 3: Large Payloads

**Symptom:** Slow response times, high memory usage

**Detection:** Check response size

**Fix:**
- Pagination
- Field selection (don't return all columns)
- Compression

---

### Issue 4: Synchronous Operations

**Symptom:** Request blocking, low throughput

**Detection:** Profile with `node --prof`

**Fix:** Use async/await, promises, streams

---

## Performance Checklist

Before deploying:

- [ ] All list endpoints have pagination
- [ ] Frequently queried columns have indexes
- [ ] No N+1 queries
- [ ] Response compression enabled
- [ ] Database connection pooling configured
- [ ] Slow queries identified and optimized
- [ ] Performance monitoring in place
- [ ] Load testing performed
- [ ] Memory usage is acceptable
- [ ] No blocking synchronous operations

---

## When NOT to Optimize

- [ ] Feature is not used frequently (< 10 req/day)
- [ ] Performance meets budgets
- [ ] Optimization would make code hard to maintain
- [ ] You haven't measured first

**Remember:** Premature optimization is the root of all evil.

**Always:** Measure → Analyze → Optimize → Measure again

---

## Summary

**Performance Budgets:**
- Database: < 100ms
- API endpoints: < 200ms
- Memory: < 50MB per request

**Optimization Priority:**
1. Fix N+1 queries (critical)
2. Add database indexes (high impact, low effort)
3. Implement pagination (required)
4. Add caching (only if needed)
5. Optimize algorithms (rare)

**Philosophy:** Make it work, make it right, make it fast (in that order).
