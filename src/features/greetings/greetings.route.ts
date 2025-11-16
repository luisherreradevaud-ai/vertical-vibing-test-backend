import { Router, Request, Response } from 'express';
import { GreetingsService } from './greetings.service';

/**
 * Create Greetings Router
 *
 * Factory function that creates and configures the greetings routes
 */
export function createGreetingsRouter(): Router {
  const router = Router();
  const service = new GreetingsService();

  /**
   * GET /api/greetings
   *
   * Returns a list of greetings in different languages
   *
   * @returns {status: 'success', data: Greeting[]}
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const greetings = await service.getGreetings();

      return res.status(200).json({
        status: 'success',
        data: greetings,
      });
    } catch (error) {
      console.error('Error fetching greetings:', error);
      return res.status(500).json({
        status: 'error',
        code: 'ERR_INTERNAL_001',
        message: 'Internal server error',
      });
    }
  });

  return router;
}
