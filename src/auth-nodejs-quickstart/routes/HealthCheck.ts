import { Router } from 'express';
import { Container } from '@azure/cosmos';
import { logger as rootLogger } from '../utils/telemetry/logger';

const logger = rootLogger;

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
      logger.debug('Health check - checking database connection');
      
      // Check Cosmos DB connection
      await container.read();
      
      logger.debug('Health check - database connected');
      
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          api: 'running'
      }
    });
  } catch (error: any) {
    logger.error('Health check failed', error);
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

  /**
   * @swagger
   * /api/test-logging:
   *   get:
   *     summary: Test logging and Application Insights
   *     tags: [Health]
   *     security: []
   *     responses:
   *       200:
   *         description: Logging test completed
   */
  router.get('/test-logging', async (req, res) => {
    
    logger.info('Testing info log', { testData: 'sample info', userId: 'test-user' });
    logger.warn('Testing warning log', { testData: 'sample warning', level: 'medium' });
    logger.debug('Testing debug log', { testData: 'sample debug' });
    
    // Test error logging with a mock error
    try {
      throw new Error('This is a test error for Application Insights');
    } catch (error) {
      logger.error('Testing error log', error, { testData: 'sample error context' });
    }
    
    res.json({
      status: 'ok',
      message: 'Logging test completed. Check console output and Application Insights.',
      logs: [
        'info - logged',
        'warn - logged',
        'debug - logged (dev only)',
        'error - logged with exception'
      ]
    });
  });

  return router;
}
