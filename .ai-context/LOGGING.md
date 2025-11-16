# Logging Standards

**Purpose:** Consistent, structured logging for debugging, monitoring, and auditing.

**Philosophy:** Log what matters, not everything. Make logs actionable.

---

## Log Levels (STRICT)

| Level | When to Use | Examples | Production? |
|-------|-------------|----------|-------------|
| `error` | Errors requiring immediate attention | Uncaught exceptions, failed external API calls, data corruption | Yes |
| `warn` | Potential issues, degraded performance | Deprecated API usage, slow queries, rate limit approaching | Yes |
| `info` | Important business events | User registered, order placed, payment processed | Yes |
| `debug` | Detailed diagnostic information | Query parameters, calculation steps, cache hits/misses | Dev only |
| `trace` | Very detailed (use sparingly) | Variable values at each step, full request/response | Dev only |

---

## What to Log

### ✅ ALWAYS Log

1. **Application Lifecycle**
   ```typescript
   logger.info('Server started', { port: 3000, env: 'production' });
   logger.info('Database connected', { host: 'localhost' });
   logger.info('Graceful shutdown initiated');
   ```

2. **Authentication Events**
   ```typescript
   logger.info('User logged in', {
     userId: user.id,
     email: user.email,
     ip: req.ip
   });

   logger.warn('Failed login attempt', {
     email: req.body.email,
     ip: req.ip,
     reason: 'invalid_password'
   });

   logger.info('User logged out', { userId: user.id });
   ```

3. **API Requests (HTTP)**
   ```typescript
   logger.info('HTTP Request', {
     method: req.method,
     path: req.path,
     statusCode: res.statusCode,
     duration: `${duration}ms`,
     userId: req.user?.id,
     ip: req.ip
   });
   ```

4. **Errors with Full Context**
   ```typescript
   logger.error('Failed to process payment', {
     error: error.message,
     stack: error.stack,
     userId: user.id,
     orderId: order.id,
     amount: order.total
   });
   ```

5. **External API Calls**
   ```typescript
   logger.info('External API call', {
     service: 'payment-gateway',
     endpoint: '/api/charge',
     duration: `${duration}ms`,
     statusCode: response.status
   });

   logger.error('External API failed', {
     service: 'payment-gateway',
     error: error.message,
     retryCount: 3
   });
   ```

6. **Database Migrations**
   ```typescript
   logger.info('Running migration', { migration: '001_create_users' });
   logger.info('Migration completed', { migration: '001_create_users', duration: '150ms' });
   ```

7. **Business Events**
   ```typescript
   logger.info('Order created', {
     orderId: order.id,
     userId: user.id,
     total: order.total,
     itemCount: order.items.length
   });

   logger.info('Payment processed', {
     orderId: order.id,
     amount: payment.amount,
     method: payment.method
   });
   ```

### ⚠️ SOMETIMES Log

1. **Validation Errors (info level)**
   ```typescript
   logger.info('Validation failed', {
     endpoint: req.path,
     errors: validationErrors
   });
   ```

2. **Cache Operations (debug level)**
   ```typescript
   logger.debug('Cache hit', { key: 'products:list', ttl: 300 });
   logger.debug('Cache miss', { key: 'products:list' });
   ```

3. **Performance Metrics (debug level)**
   ```typescript
   logger.debug('Slow query detected', {
     query: 'SELECT * FROM users',
     duration: '150ms',
     threshold: '100ms'
   });
   ```

### ❌ NEVER Log

1. **Passwords (plain text or hashed)**
   ```typescript
   // ❌ BAD - Never log passwords
   logger.info('User created', { email, password });

   // ✅ GOOD
   logger.info('User created', { email, userId });
   ```

2. **Credit Card Numbers**
   ```typescript
   // ❌ BAD
   logger.info('Payment', { cardNumber: '4111111111111111' });

   // ✅ GOOD
   logger.info('Payment', { last4: '1111', brand: 'visa' });
   ```

3. **API Keys / Secrets**
   ```typescript
   // ❌ BAD
   logger.info('API call', { apiKey: process.env.API_KEY });

   // ✅ GOOD
   logger.info('API call', { service: 'payment-gateway' });
   ```

4. **Personal Health Information (PHI)**
   - Medical records
   - Health data
   - Diagnoses

5. **Full Request/Response Bodies (production)**
   ```typescript
   // ❌ BAD (in production)
   logger.info('Request', { body: req.body });

   // ✅ GOOD (in production)
   logger.info('Request', {
     endpoint: req.path,
     method: req.method
   });

   // ✅ OK (in development only)
   if (process.env.NODE_ENV === 'development') {
     logger.debug('Request body', { body: req.body });
   }
   ```

6. **Stack Traces to Users**
   ```typescript
   // ❌ BAD - Don't send stack trace to client
   res.status(500).json({ error: error.stack });

   // ✅ GOOD - Log internally, send generic message to client
   logger.error('Error', { error: error.message, stack: error.stack });
   res.status(500).json({ error: 'Internal server error' });
   ```

---

## Log Format (Structured JSON)

### Standard Format

```json
{
  "level": "info",
  "time": "2025-11-16T12:00:00.000Z",
  "msg": "User registered",
  "userId": "uuid",
  "email": "user@example.com",
  "requestId": "uuid",
  "hostname": "server-1",
  "pid": 12345
}
```

### Implementation with Pino

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV,
    hostname: process.env.HOSTNAME || 'unknown'
  }
});
```

### Usage

```typescript
// ✅ Good - Structured logging
logger.info({ userId: '123', action: 'login' }, 'User logged in');

// ✅ Good - Include context
logger.error({
  error: error.message,
  stack: error.stack,
  userId: user.id
}, 'Failed to create order');

// ❌ Bad - Unstructured
logger.info('User 123 logged in');  // Hard to search/filter

// ❌ Bad - String concatenation
logger.info('User ' + userId + ' logged in');
```

---

## Request ID Tracking

### Add Request ID Middleware

```typescript
import { v4 as uuidv4 } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

// Add to app
app.use(requestIdMiddleware);
```

### Use in Logging

```typescript
logger.info({
  requestId: req.id,
  method: req.method,
  path: req.path
}, 'HTTP Request');
```

### Child Loggers

```typescript
// Create child logger with request context
export function loggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.logger = logger.child({
    requestId: req.id,
    userId: req.user?.id
  });
  next();
}

// Usage in route
router.get('/users', (req, res) => {
  req.logger.info('Fetching users');  // Automatically includes requestId
});
```

---

## HTTP Request Logging

### Morgan + Pino Integration

```typescript
import morgan from 'morgan';
import { logger } from './logger';

// Custom morgan stream that writes to pino
const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

// Morgan middleware
app.use(morgan('combined', { stream }));
```

### Custom HTTP Logging Middleware

```typescript
export function httpLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    const logLevel = res.statusCode >= 500 ? 'error' :
                     res.statusCode >= 400 ? 'warn' :
                     'info';

    logger[logLevel]({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.id
    }, 'HTTP Request');
  });

  next();
}
```

---

## Error Logging Pattern

### In Error Handler

```typescript
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Determine log level
  const isOperational = err instanceof AppError;
  const logLevel = isOperational ? 'warn' : 'error';

  // Log with full context
  logger[logLevel]({
    error: err.message,
    stack: err.stack,
    code: (err as AppError).code,
    statusCode: (err as AppError).statusCode || 500,
    requestId: req.id,
    userId: req.user?.id,
    path: req.path,
    method: req.method,
    body: process.env.NODE_ENV === 'development' ? req.body : undefined
  }, 'Request error');

  // Send response to client (no stack trace)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      message: err.message
    });
  }

  // Unexpected error
  return res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
}
```

### In Try-Catch

```typescript
try {
  await processPayment(order);
} catch (error) {
  logger.error({
    error: error.message,
    stack: error.stack,
    orderId: order.id,
    userId: user.id,
    amount: order.total
  }, 'Payment processing failed');

  throw new AppError(500, 'Payment failed', 'ERR_EXTERNAL_001');
}
```

---

## Database Query Logging

### Enable in Development

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';

const db = drizzle(client, {
  logger: process.env.NODE_ENV === 'development' ? {
    logQuery: (query: string, params: unknown[]) => {
      logger.debug({ query, params }, 'Database query');
    }
  } : false
});
```

### Log Slow Queries

```typescript
const SLOW_QUERY_THRESHOLD = 100; // ms

export async function loggedQuery<T>(
  name: string,
  query: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  try {
    const result = await query();
    const duration = Date.now() - start;

    if (duration > SLOW_QUERY_THRESHOLD) {
      logger.warn({
        query: name,
        duration: `${duration}ms`,
        threshold: `${SLOW_QUERY_THRESHOLD}ms`
      }, 'Slow query detected');
    }

    return result;
  } catch (error) {
    logger.error({
      query: name,
      error: error.message
    }, 'Query failed');
    throw error;
  }
}

// Usage
const users = await loggedQuery('findUsers', () =>
  db.select().from(users).where(eq(users.isActive, true))
);
```

---

## Environment-Specific Logging

```typescript
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

  // Pretty print in development
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined
});
```

---

## Log Rotation (Production)

### File Logging with Rotation

```typescript
import pino from 'pino';
import { createStream } from 'rotating-file-stream';

// Create rotating file stream
const stream = createStream('app.log', {
  interval: '1d',     // Rotate daily
  maxFiles: 30,       // Keep 30 days
  compress: 'gzip',   // Compress old logs
  path: './logs'
});

const logger = pino(stream);
```

### Or use PM2/systemd

```bash
# PM2 handles log rotation
pm2 start app.js --log ./logs/app.log

# systemd with journald
journalctl -u myapp -f
```

---

## Alerting on Errors

### Send Critical Errors to External Services

```typescript
// Integrate with Sentry
import * as Sentry from '@sentry/node';

logger.error = ((original) => {
  return (obj: any, msg?: string) => {
    // Log normally
    original.call(logger, obj, msg);

    // Send to Sentry if critical
    if (obj.level === 'error' && !obj.isOperational) {
      Sentry.captureException(new Error(obj.error), {
        extra: obj
      });
    }
  };
})(logger.error);
```

---

## Metrics Logging

### Custom Metrics

```typescript
logger.info({
  metric: 'order_created',
  value: 1,
  tags: { userId: user.id, total: order.total }
}, 'Order metric');

logger.info({
  metric: 'api_response_time',
  value: duration,
  tags: { endpoint: req.path, method: req.method }
}, 'Performance metric');
```

### Use Dedicated APM

For production, use proper APM tools:
- **Datadog**
- **New Relic**
- **Elastic APM**

---

## Best Practices

### ✅ Do:

1. **Use structured logging (JSON)**
   ```typescript
   logger.info({ userId, action }, 'Message');
   ```

2. **Include context**
   ```typescript
   logger.error({
     error: err.message,
     stack: err.stack,
     userId,
     requestId
   }, 'Error message');
   ```

3. **Log at appropriate level**
   - Error: requires attention
   - Warn: potential issue
   - Info: business events
   - Debug: diagnostic info

4. **Use child loggers for context**
   ```typescript
   const childLogger = logger.child({ requestId });
   ```

5. **Sanitize sensitive data**
   ```typescript
   const sanitized = { ...user, password: undefined };
   logger.info({ user: sanitized }, 'User created');
   ```

### ❌ Don't:

1. **Don't log secrets**
2. **Don't use `console.log` in production**
3. **Don't log in tight loops**
   ```typescript
   // ❌ Bad
   items.forEach(item => {
     logger.debug('Processing item', { item });
   });

   // ✅ Good
   logger.debug('Processing items', { count: items.length });
   ```

4. **Don't expose stack traces to users**
5. **Don't log large objects**
   ```typescript
   // ❌ Bad
   logger.info({ user, orders, products }, 'Data');  // Too much

   // ✅ Good
   logger.info({ userId: user.id, orderCount: orders.length }, 'Summary');
   ```

---

## Testing Logs

```typescript
import { vi } from 'vitest';

describe('UserService', () => {
  it('should log user creation', async () => {
    const loggerSpy = vi.spyOn(logger, 'info');

    await service.createUser(userData);

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(String),
        email: userData.email
      }),
      'User created'
    );
  });
});
```

---

## Summary

**Log Levels:**
- `error` - Requires attention
- `warn` - Potential issue
- `info` - Business events
- `debug` - Diagnostic (dev only)

**Always Log:**
- Authentication events
- HTTP requests
- Errors with context
- Business events
- External API calls

**Never Log:**
- Passwords
- API keys
- Credit card numbers
- PHI/PII

**Format:**
- Structured JSON
- Include requestId
- Include userId
- Include timestamps

**Production:**
- Use log rotation
- Ship to centralized logging (ELK, Datadog, etc.)
- Set up alerts for errors
- Monitor slow queries

**Remember:** Logs are for debugging and monitoring, not for users. Never expose sensitive data or technical details to clients.
