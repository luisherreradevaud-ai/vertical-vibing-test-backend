import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { createGreetingsRouter } from './features/greetings/greetings.route';
import { createAuthRouter } from './features/auth/auth.route';
import { createUsersRouter } from './features/users/users.route';
import { createSubscriptionsRouter } from './features/subscriptions/subscriptions.route';
import { createCompaniesRouter } from './features/companies/companies.route';

config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});
