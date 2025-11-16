# Anti-Patterns

**Purpose:** Document common mistakes and patterns to AVOID. Learn from others' errors.

**Rule:** If you find yourself doing any of these, STOP and refactor.

---

## ❌ Anti-Pattern #1: Direct Database Access in Routes

### The Problem

```typescript
// ❌ BAD - Database access in route handler
router.get('/users', async (req, res) => {
  const users = await db.select().from(usersTable);
  res.json(users);
});
```

### Why It's Bad

- Violates separation of concerns
- Makes testing difficult (can't mock)
- Couples route to database implementation
- No place for business logic
- Hard to reuse

### The Fix

```typescript
// ✅ GOOD - Use service layer
router.get('/users', asyncHandler(async (req, res) => {
  const users = await usersService.listUsers();
  return ApiResponse.success(res, users);
}));

// In service
class UsersService {
  constructor(private repository: UsersRepository) {}

  async listUsers() {
    return this.repository.findAll();
  }
}
```

---

## ❌ Anti-Pattern #2: Business Logic in Repository

### The Problem

```typescript
// ❌ BAD - Validation in repository
class UsersRepository {
  async createUser(data: NewUser) {
    // Validation should NOT be here
    if (!data.email.includes('@')) {
      throw new Error('Invalid email');
    }

    if (data.password.length < 8) {
      throw new Error('Password too short');
    }

    return db.insert(users).values(data);
  }
}
```

### Why It's Bad

- Repository should only handle data access
- Business rules belong in service layer
- Harder to test business logic
- Violates single responsibility principle

### The Fix

```typescript
// ✅ GOOD - Validation in service
class UsersService {
  async createUser(input: CreateUserInput) {
    // Validate (or use Zod middleware)
    if (!input.email.includes('@')) {
      throw new AppError(400, 'Invalid email', 'ERR_VALIDATION_001');
    }

    // Check business rules
    if (await this.repository.emailExists(input.email)) {
      throw new AppError(409, 'Email already exists', 'ERR_RESOURCE_002');
    }

    // Repository just does data access
    return this.repository.createUser(input);
  }
}

// Repository stays simple
class UsersRepository {
  async createUser(data: NewUser) {
    return db.insert(users).values(data).returning();
  }
}
```

---

## ❌ Anti-Pattern #3: Circular Dependencies Between Features

### The Problem

```typescript
// ❌ BAD - Features depend on each other
// features/users/users.service.ts
import { OrdersService } from '../orders/orders.service';

class UsersService {
  constructor(private ordersService: OrdersService) {}
}

// features/orders/orders.service.ts
import { UsersService } from '../users/users.service';

class OrdersService {
  constructor(private usersService: UsersService) {}
}
```

### Why It's Bad

- Violates feature independence
- Creates tight coupling
- Impossible to import (circular dependency error)
- Hard to test
- Features can't be moved/extracted

### The Fix

**Option 1: Extract to shared**
```typescript
// shared/services/notification.service.ts
class NotificationService {
  async notifyUser(userId: string, message: string) { ... }
}

// Both features use shared service
```

**Option 2: Use events**
```typescript
// features/orders/orders.service.ts
import { eventBus } from '../../shared/events';

class OrdersService {
  async createOrder(order: Order) {
    const created = await this.repository.create(order);

    // Emit event instead of calling user service directly
    eventBus.emit('order.created', { orderId: created.id, userId: order.userId });

    return created;
  }
}

// features/users/users.service.ts
eventBus.on('order.created', async (event) => {
  await usersService.sendOrderConfirmation(event.userId, event.orderId);
});
```

**Option 3: Duplicate code**
```typescript
// Sometimes duplication is better than coupling
// features/users/email.helper.ts
function sendEmail() { ... }

// features/orders/email.helper.ts
function sendEmail() { ... }  // Same code, duplicated

// Extract to shared ONLY when used by 3+ features
```

---

## ❌ Anti-Pattern #4: Silent Failures

### The Problem

```typescript
// ❌ BAD - Swallowing errors
async function deleteUser(id: string) {
  try {
    await db.delete(users).where(eq(users.id, id));
  } catch (error) {
    // Silently swallowed - caller thinks it succeeded!
  }
}

// ❌ BAD - Returning null/undefined instead of throwing
async function getUser(id: string) {
  try {
    return await db.query.users.findFirst({ where: eq(users.id, id) });
  } catch (error) {
    return null;  // Caller can't distinguish between "not found" and "error"
  }
}
```

### Why It's Bad

- Hides bugs
- Makes debugging impossible
- Caller can't handle error appropriately
- Data inconsistency

### The Fix

```typescript
// ✅ GOOD - Let errors propagate
async function deleteUser(id: string) {
  try {
    await db.delete(users).where(eq(users.id, id));
  } catch (error) {
    logger.error({ error, userId: id }, 'Failed to delete user');
    throw new AppError(500, 'Failed to delete user', 'ERR_INTERNAL_003');
  }
}

// ✅ GOOD - Throw appropriate error
async function getUser(id: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });

  if (!user) {
    throw new AppError(404, 'User not found', 'ERR_RESOURCE_001');
  }

  return user;
}
```

---

## ❌ Anti-Pattern #5: Callback Hell / Promise Hell

### The Problem

```typescript
// ❌ BAD - Callback hell
getUserById(id, (err, user) => {
  if (err) return handleError(err);

  getOrdersByUserId(user.id, (err, orders) => {
    if (err) return handleError(err);

    orders.forEach(order => {
      getOrderItems(order.id, (err, items) => {
        if (err) return handleError(err);
        // ... more nesting
      });
    });
  });
});

// ❌ BAD - Promise hell (similar structure)
getUserById(id)
  .then(user => {
    return getOrdersByUserId(user.id)
      .then(orders => {
        return Promise.all(orders.map(order =>
          getOrderItems(order.id)
        ));
      });
  });
```

### Why It's Bad

- Hard to read
- Error handling is complex
- Difficult to maintain
- Prone to bugs

### The Fix

```typescript
// ✅ GOOD - Async/await
async function getUserWithOrders(id: string) {
  const user = await getUserById(id);
  const orders = await getOrdersByUserId(user.id);

  const ordersWithItems = await Promise.all(
    orders.map(async order => ({
      ...order,
      items: await getOrderItems(order.id)
    }))
  );

  return { user, orders: ordersWithItems };
}
```

---

## ❌ Anti-Pattern #6: God Object / God Service

### The Problem

```typescript
// ❌ BAD - Service does everything
class UserService {
  async createUser() { ... }
  async updateUser() { ... }
  async deleteUser() { ... }
  async sendEmail() { ... }
  async processPayment() { ... }
  async generateReport() { ... }
  async exportData() { ... }
  async importData() { ... }
  async calculateStatistics() { ... }
  async sendNotification() { ... }
  // ... 50 more methods
}
```

### Why It's Bad

- Violates single responsibility
- Hard to test
- Hard to understand
- Everything depends on everything
- Merge conflicts in team

### The Fix

```typescript
// ✅ GOOD - Separate concerns
class UserService {
  async createUser() { ... }
  async updateUser() { ... }
  async deleteUser() { ... }
}

class EmailService {
  async sendWelcomeEmail() { ... }
  async sendPasswordReset() { ... }
}

class PaymentService {
  async processPayment() { ... }
  async refund() { ... }
}

class ReportService {
  async generateUserReport() { ... }
}
```

---

## ❌ Anti-Pattern #7: Magic Numbers / Magic Strings

### The Problem

```typescript
// ❌ BAD - Magic numbers
if (user.age < 18) { ... }
if (product.stock < 5) { ... }
if (price > 1000) { ... }

// ❌ BAD - Magic strings
if (user.role === 'admin') { ... }
if (status === 'pending') { ... }
```

### Why It's Bad

- No context for the value
- Hard to change
- Typos in strings
- Unclear intent

### The Fix

```typescript
// ✅ GOOD - Named constants
const MINIMUM_AGE = 18;
const LOW_STOCK_THRESHOLD = 5;
const EXPENSIVE_ITEM_THRESHOLD = 1000;

if (user.age < MINIMUM_AGE) { ... }
if (product.stock < LOW_STOCK_THRESHOLD) { ... }
if (price > EXPENSIVE_ITEM_THRESHOLD) { ... }

// ✅ GOOD - Enums or literal types
type UserRole = 'admin' | 'user' | 'guest';
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered';

if (user.role === 'admin') { ... }  // TypeScript will catch typos
```

---

## ❌ Anti-Pattern #8: Not Using Pagination

### The Problem

```typescript
// ❌ BAD - Returns all records
router.get('/products', async (req, res) => {
  const products = await db.select().from(products);  // Could be 100,000 items!
  res.json(products);
});
```

### Why It's Bad

- Performance issues (slow queries)
- High memory usage
- Slow response times
- Poor user experience
- Can crash server with large datasets

### The Fix

```typescript
// ✅ GOOD - Always paginate
router.get('/products', validateQuery(listQuerySchema), async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const { data, total } = await service.listProducts(limit, offset);

  return ApiResponse.paginated(res, data, total, limit, offset);
});
```

---

## ❌ Anti-Pattern #9: Inconsistent Error Handling

### The Problem

```typescript
// ❌ BAD - Different error formats
router.get('/users/:id', async (req, res) => {
  try {
    const user = await service.getUser(req.params.id);
    res.json(user);
  } catch (error) {
    res.json({ error: error.message });  // Different format
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = await service.getProduct(req.params.id);
    res.json(product);
  } catch (error) {
    res.status(500).send(error.message);  // Different format
  }
});
```

### Why It's Bad

- Clients can't handle errors consistently
- No standard error codes
- Some errors don't have status codes
- Hard to debug

### The Fix

```typescript
// ✅ GOOD - Consistent error handling with middleware
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await service.getUser(req.params.id);
  return ApiResponse.success(res, user);
}));

// All errors caught by global error handler
export function errorHandler(err, req, res, next) {
  // Always returns consistent format
  res.status(err.statusCode || 500).json({
    status: 'error',
    code: err.code || 'ERR_INTERNAL_001',
    message: err.message
  });
}
```

---

## ❌ Anti-Pattern #10: Premature Optimization

### The Problem

```typescript
// ❌ BAD - Complex caching before measuring
class ProductService {
  private cache = new LRU({ max: 1000, ttl: 300000 });
  private queryCache = new Map();
  private resultPool = [];

  async getProduct(id: string) {
    // 100 lines of caching logic
    // ...before we even know if it's needed
  }
}
```

### Why It's Bad

- Adds complexity without proven benefit
- Harder to maintain
- May not solve actual bottleneck
- Premature optimization is the root of all evil

### The Fix

```typescript
// ✅ GOOD - Simple first, measure, then optimize
class ProductService {
  async getProduct(id: string) {
    return this.repository.findById(id);  // Simple, clear
  }
}

// THEN measure performance
// IF slow (> 100ms) AND frequently called (> 100 req/min)
// THEN add caching

// See PERFORMANCE.md for when to optimize
```

---

## ❌ Anti-Pattern #11: Using `any` Type

### The Problem

```typescript
// ❌ BAD - Using 'any' defeats TypeScript
function processData(data: any) {
  return data.map((item: any) => item.value);  // No type safety
}

// ❌ BAD - Casting to any
const user = await getUser(id) as any;
user.nonExistentProperty;  // No error!
```

### Why It's Bad

- Loses all type safety
- Runtime errors instead of compile-time errors
- No autocomplete
- Makes refactoring dangerous

### The Fix

```typescript
// ✅ GOOD - Proper types
function processData<T extends { value: unknown }>(data: T[]) {
  return data.map(item => item.value);
}

// ✅ GOOD - Use unknown if type is truly unknown
function processUnknownData(data: unknown) {
  if (Array.isArray(data)) {
    return data.map(item => item);
  }
  throw new Error('Invalid data');
}
```

---

## ❌ Anti-Pattern #12: N+1 Query Problem

### The Problem

```typescript
// ❌ BAD - N+1 queries (1 + N database calls)
async function getOrdersWithUsers() {
  const orders = await db.select().from(orders);  // 1 query

  for (const order of orders) {
    order.user = await db.query.users.findFirst({  // N queries (one per order)
      where: eq(users.id, order.userId)
    });
  }

  return orders;
}
// If you have 100 orders, this makes 101 database queries!
```

### Why It's Bad

- Extremely slow
- Scales poorly
- High database load
- Poor performance

### The Fix

```typescript
// ✅ GOOD - Single query with JOIN
async function getOrdersWithUsers() {
  return db
    .select({
      order: orders,
      user: users
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id));
}
// Only 1 database query!
```

---

## ❌ Anti-Pattern #13: Not Validating Inputs

### The Problem

```typescript
// ❌ BAD - No validation
router.post('/users', async (req, res) => {
  const user = await service.createUser(req.body);  // What if req.body is invalid?
  res.json(user);
});
```

### Why It's Bad

- SQL injection risk (if not using ORM properly)
- Unexpected data types cause errors
- XSS vulnerabilities
- Business logic corruption

### The Fix

```typescript
// ✅ GOOD - Always validate with Zod
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

router.post(
  '/users',
  validateBody(createUserSchema),
  asyncHandler(async (req, res) => {
    const user = await service.createUser(req.body);  // req.body is now typed and validated
    return ApiResponse.created(res, user);
  })
);
```

---

## ❌ Anti-Pattern #14: Hardcoded Configuration

### The Problem

```typescript
// ❌ BAD - Hardcoded values
const DB_HOST = 'localhost';
const DB_PORT = 5432;
const API_KEY = 'sk_live_abc123';  // Never do this!

// ❌ BAD - Different behavior in code
if (/* some condition */) {
  apiUrl = 'https://api.production.com';
} else {
  apiUrl = 'https://api.staging.com';
}
```

### Why It's Bad

- Can't change without code changes
- Secrets committed to git
- Different environments need different builds
- Security risk

### The Fix

```typescript
// ✅ GOOD - Environment variables
const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432')
  },
  api: {
    key: process.env.API_KEY  // Never commit .env file
  }
};

// ✅ GOOD - Use .env files
// .env.development
DB_HOST=localhost
API_KEY=sk_test_xyz

// .env.production
DB_HOST=prod-db.example.com
API_KEY=sk_live_real_key
```

---

## ❌ Anti-Pattern #15: Mixing Concerns in Tests

### The Problem

```typescript
// ❌ BAD - Test does too much
it('should work', async () => {
  const user = await createUser({ email: 'test@example.com' });
  const order = await createOrder({ userId: user.id });
  const payment = await processPayment(order.id);
  const shipment = await createShipment(order.id);

  expect(shipment.status).toBe('shipped');
  // If this fails, which part is broken?
});
```

### Why It's Bad

- Hard to know what failed
- Tests multiple things
- Slow
- Hard to maintain

### The Fix

```typescript
// ✅ GOOD - One test per concern
it('should create user with valid data', async () => {
  const user = await createUser({ email: 'test@example.com' });
  expect(user.email).toBe('test@example.com');
});

it('should create order for user', async () => {
  const order = await createOrder({ userId: mockUserId });
  expect(order.userId).toBe(mockUserId);
});

it('should process payment', async () => {
  const payment = await processPayment(mockOrderId);
  expect(payment.status).toBe('completed');
});
```

---

## Summary: Common Anti-Pattern Categories

### Architectural
- Direct DB access in routes
- Business logic in repositories
- Circular feature dependencies
- God objects

### Code Quality
- Magic numbers/strings
- Premature optimization
- Using `any` type
- Not validating inputs

### Error Handling
- Silent failures
- Inconsistent error formats
- Not logging errors

### Performance
- N+1 queries
- No pagination
- Synchronous operations in async context

### Security
- Hardcoded secrets
- No input validation
- Exposing stack traces

---

**Remember:** If you see these patterns, refactor immediately. Technical debt compounds.

**When in doubt:** Check DECISION-TREES.md for the right pattern to use.
