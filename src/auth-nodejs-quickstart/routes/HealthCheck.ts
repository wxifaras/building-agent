import { Router } from 'express';
import { Container } from '@azure/cosmos';

export function initHealthRoutes(container: Container) {
  const router = Router();

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
