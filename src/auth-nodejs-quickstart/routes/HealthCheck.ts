import { Router } from 'express';
import { Container } from '@azure/cosmos';

export function initHealthRoutes(container: Container) {
  const router = Router();

  /**
   * @swagger
   * /api/health:
   *   get:
   *     summary: Check API health status
   *     tags: [Health]
   *     security: []
   *     responses:
   *       200:
   *         description: API is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                 services:
   *                   type: object
   *                   properties:
   *                     database:
   *                       type: string
   *                       example: connected
   *                     api:
   *                       type: string
   *                       example: running
   *       503:
   *         description: Service unavailable
   */
  router.get('/health', async (req, res) => {
    try {
      // Check Cosmos DB connection
      await container.read();
      
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          api: 'running'
        }
      });
    } catch (error: any) {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        services: {
          database: 'disconnected',
          api: 'running'
        },
        error: error.message
      });
    }
  });

  return router;
}
