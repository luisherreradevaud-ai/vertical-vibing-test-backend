import { config } from 'dotenv';

// Load environment variables FIRST, before any other imports
config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createGreetingsRouter } from './features/greetings/greetings.route';
import { createAuthRouter } from './features/auth/auth.route';
import { createUsersRouter } from './features/users/users.route';
import { createSubscriptionsRouter } from './features/subscriptions/subscriptions.route';
import { createCompaniesRouter } from './features/companies/companies.route';
import { createIAMRouter } from './features/iam/iam.route';
import { rateLimitMiddleware } from './shared/middleware/rateLimit';
import { SuperAdminBootstrapService } from './shared/services/super-admin-bootstrap.service';
// import { seedIAMData } from './shared/db/seed/iam.seed';

// Initialize super admin on startup (dev/staging only)
SuperAdminBootstrapService.initialize().catch((error) => {
  console.error('Failed to initialize super admin:', error);
});

// Seed IAM data on startup (disabled - run manually if needed)
// seedIAMData().catch((error) => {
//   console.error('Failed to seed IAM data:', error);
// });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting (applied to all routes)
app.use(rateLimitMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', createAuthRouter());
app.use('/api/users', createUsersRouter());
app.use('/api/subscriptions', createSubscriptionsRouter());
app.use('/api/companies', createCompaniesRouter());
app.use('/api/greetings', createGreetingsRouter());
app.use('/api/iam', createIAMRouter());

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});
