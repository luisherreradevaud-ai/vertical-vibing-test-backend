/**
 * Embedded Email Worker
 *
 * Runs the email worker within the main application process.
 * Useful for:
 * - Development environments
 * - Small applications with low email volume
 * - Simplified deployment (single process)
 *
 * Usage in main app (src/index.ts):
 *
 *   import { EmbeddedEmailWorker } from './features/email/queue/embedded-worker.js';
 *
 *   // After Express server starts
 *   const emailWorker = new EmbeddedEmailWorker();
 *   await emailWorker.start();
 *
 *   // In shutdown handler
 *   await emailWorker.stop();
 *
 * Trade-offs:
 * - ✅ Simple deployment (one process)
 * - ✅ No separate infrastructure needed
 * - ✅ Good for development
 * - ❌ Shares resources with main app
 * - ❌ Can't scale independently
 * - ❌ Worker crashes affect main app
 */

import { logger } from '../../../shared/utils/logger.js';
import { EmailWorker } from './email-worker.js';
import { ConfigService } from '../config.service.js';

export class EmbeddedEmailWorker {
  private worker: EmailWorker | null = null;
  private configService: ConfigService;

  constructor(configService?: ConfigService) {
    this.configService = configService ?? new ConfigService();
  }

  /**
   * Start embedded worker if enabled in configuration
   */
  async start(): Promise<void> {
    try {
      // Check if worker is enabled
      const workerConfig = await this.configService.getWorkerConfig();

      if (!workerConfig.enabled) {
        logger.info('Embedded email worker is disabled');
        return;
      }

      logger.info('Starting embedded email worker...');

      this.worker = new EmailWorker(undefined, this.configService);

      // Start worker in background (non-blocking)
      this.worker.start().catch((error) => {
        logger.error({ error }, 'Embedded worker crashed');
      });

      logger.info('Embedded email worker started');
    } catch (error) {
      logger.error({ error }, 'Error starting embedded email worker');
      throw error;
    }
  }

  /**
   * Stop embedded worker
   */
  async stop(): Promise<void> {
    if (this.worker) {
      logger.info('Stopping embedded email worker...');
      await this.worker.stop();
      logger.info('Embedded email worker stopped');
    }
  }

  /**
   * Get worker statistics
   */
  getStats() {
    return this.worker?.getStats() ?? null;
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.worker) {
      return {
        healthy: false,
        queueAccessible: false,
        isRunning: false,
        stats: null,
      };
    }

    return await this.worker.healthCheck();
  }

  /**
   * Check if worker is running
   */
  isRunning(): boolean {
    return this.worker !== null && this.worker.getStats().isRunning;
  }
}

// Export singleton instance for easy integration
export const embeddedEmailWorker = new EmbeddedEmailWorker();
