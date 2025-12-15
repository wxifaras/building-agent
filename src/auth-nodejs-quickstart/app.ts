import dotenv from 'dotenv';
dotenv.config();

// Initialize telemetry FIRST (before importing Express or other instrumented libraries)
import { initTelemetry } from './utils/telemetry/telemetry';
initTelemetry();

import express from 'express';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { initAuthMiddleware } from './utils/auth/AuthMiddleware';
import { initProjectRoutes } from './routes/Projects';
import { initProjectMemberRoutes } from './routes/ProjectMembers';
import { initHealthRoutes } from './routes/HealthCheck';
import { CacheFactory } from './utils/cache/CacheFactory';
import { setCacheInstance, getCacheStats } from './utils/cache/CacheHelpers';
import { debugTokenMiddleware } from './utils/auth/JWTValidation';
import { telemetryMiddleware } from './utils/telemetry/telemetryMiddleware';
import { createLogger } from './utils/telemetry/logger';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import cors from 'cors';

const logger = createLogger({ component: 'App' });
const app = express();

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Telemetry middleware (must be after body parser, before routes)
app.use(telemetryMiddleware);

// Debug Token Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(debugTokenMiddleware);
}

// Error handler middleware
const errorHandler = (err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error', err, {
    url: req.url,
    method: req.method,
    userAgent: req.get('user-agent') || 'unknown'
  });

  res.status(500).json({
    error: 'internal_server_error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

async function startServer() {
  try {
    // Initialize Cache
    logger.info('Initializing cache system...');
    const cache = await CacheFactory.createCache();
    setCacheInstance(cache);

    // Initialize Cosmos DB
    logger.info('Initializing Cosmos DB...');

    const endpoint = process.env.COSMOS_ENDPOINT;
    if (!endpoint) {
      throw new Error("Environment variable COSMOS_ENDPOINT must be set");
    }

    const credential = new DefaultAzureCredential();
    const cosmosClient = new CosmosClient({
      endpoint,
      aadCredentials: credential
    });

    const databaseId = process.env.COSMOS_DATABASE || "MyDatabase";
    const containerId = process.env.COSMOS_CONTAINER || "Items";
    const database = cosmosClient.database(databaseId);
    const container = database.container(containerId);
    logger.info('Cosmos DB initialized');

    // Swagger Documentation
    logger.info('Setting up Swagger documentation...');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Project Management API',
    }));

    // Initialize middleware and routes
    initAuthMiddleware(container);

    // Routes
    app.use('/api', initHealthRoutes(container));
    app.use('/api/projects', initProjectRoutes(container));
    app.use('/api', initProjectMemberRoutes(container));

    // Cache stats endpoint (development only)
    if (process.env.NODE_ENV === 'development') {
      app.get('/api/cache/stats', (req, res) => {
        res.json(getCacheStats());
      });
    }

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler (must be last)
    app.use(errorHandler);

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      const cacheStats = getCacheStats();
      const startupInfo = {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        cacheEnabled: cacheStats.connected,
        cacheType: cacheStats.type
      };

      logger.info(`Server running on port ${PORT}`, startupInfo);
    });
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...', {
    environment: process.env.NODE_ENV || 'development'
  });

  // Flush and shutdown telemetry  
  const cache = require('./utils/cache/cacheHelpers').getCacheInstance();
  if (cache) {
    try {
      await cache.disconnect();
      logger.info('Cache disconnected');
    } catch (error) {
      logger.error('Error disconnecting cache', error as Error);
    }
  }

  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();

export default app;