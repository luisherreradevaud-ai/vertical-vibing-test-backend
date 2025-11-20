#!/usr/bin/env node
/**
 * Standalone Email Worker
 *
 * A separate process that continuously polls the SQS queue and processes emails.
 *
 * Usage:
 *   npm run worker:start     # Start worker
 *   npm run worker:dev       # Start worker in dev mode with watch
 *
 * Environment Variables:
 *   WORKER_ENABLED=true
 *   WORKER_CONCURRENCY=5
 *   WORKER_POLL_INTERVAL_MS=1000
 *   EMAIL_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/email-queue
 *   AWS_REGION=us-east-1
 *
 * Deployment:
 *   - Docker container with autoscaling
 *   - Kubernetes pod
 *   - EC2 instance
 *   - ECS Fargate task
 */

import { logger } from '../../../shared/utils/logger.js';
import { EmailWorker } from './email-worker.js';

let worker: EmailWorker | null = null;

/**
 * Start the standalone worker
 */
async function startWorker() {
  try {
    logger.info('Starting standalone email worker...');

    worker = new EmailWorker();

    // Handle graceful shutdown
    setupSignalHandlers();

    // Start worker (runs indefinitely)
    await worker.start();
  } catch (error) {
    logger.error({ error }, 'Fatal error in standalone worker');
    process.exit(1);
  }
}

/**
 * Setup signal handlers for graceful shutdown
 */
function setupSignalHandlers() {
  const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

  shutdownSignals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info({ signal }, 'Received shutdown signal');
      await gracefulShutdown();
    });
  });

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception in worker');
    gracefulShutdown().then(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled rejection in worker');
    gracefulShutdown().then(() => process.exit(1));
  });
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown() {
  logger.info('Shutting down worker gracefully...');

  if (worker) {
    try {
      await worker.stop();
      const stats = worker.getStats();
      logger.info({ stats }, 'Worker stopped, final statistics');
    } catch (error) {
      logger.error({ error }, 'Error during graceful shutdown');
    }
  }

  process.exit(0);
}

/**
 * Health check endpoint (optional)
 * If you want to expose worker health via HTTP, add Express here
 */
async function setupHealthCheck() {
  // Optional: Add Express server for /health endpoint
  // This is useful for container orchestration health checks
  // Example:
  //
  // import express from 'express';
  // const app = express();
  //
  // app.get('/health', async (req, res) => {
  //   const health = await worker?.healthCheck();
  //   res.status(health?.healthy ? 200 : 503).json(health);
  // });
  //
  // app.listen(3001, () => {
  //   logger.info('Worker health check endpoint listening on port 3001');
  // });
}

// Start the worker
startWorker();
