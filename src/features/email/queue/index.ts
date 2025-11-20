/**
 * Email Queue System
 *
 * Exports all queue worker implementations:
 * - SQSQueueService: SQS queue operations
 * - EmailWorker: Base worker class
 * - Standalone worker: Separate process
 * - Embedded worker: Runs in main app
 * - Lambda handler: AWS Lambda function
 */

export { SQSQueueService } from './sqs-queue.service.js';
export { EmailWorker } from './email-worker.js';
export { EmbeddedEmailWorker, embeddedEmailWorker } from './embedded-worker.js';
export { handler as lambdaHandler, healthCheck as lambdaHealthCheck, warmUp as lambdaWarmUp } from './lambda-handler.js';

// Standalone worker is executed directly, not imported
// Run: npm run worker:start
