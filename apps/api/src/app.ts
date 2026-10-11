import fastify from 'fastify';
import pino from 'pino';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { requestIdPlugin } from './plugins/requestId.js';
import { errorHandlerPlugin } from './plugins/errorHandler.js';
import { createHealthRoutes } from './modules/health/health.routes.js';
import { HealthService } from './modules/health/health.service.js';
import type { IAIProvider } from './services/ai/ai.interface.js';
import type { IVectorService } from './services/vector/vector.interface.js';

export interface AppOptions {
  aiProvider?: IAIProvider;
  vectorService?: IVectorService;
  healthService?: HealthService;
  disableRequestLogging?: boolean;
}

export function createApp(options?: AppOptions) {
  const silentLogger = pino({ level: 'silent' });
  const appLogger = options?.disableRequestLogging ? silentLogger : logger;

  const app = fastify({
    loggerInstance: appLogger,
  });

  // Core Plugins
  app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return cb(null, true);
      // In development allow localhost from Vite
      if (env.NODE_ENV === 'development') return cb(null, true);
      if (origin === env.CORS_ORIGIN) return cb(null, true);
      return cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  app.register(sensible);
  app.register(requestIdPlugin);
  app.register(errorHandlerPlugin);

  // Health service with injected dependencies if provided
  const healthService =
    options?.healthService ||
    new HealthService(options?.aiProvider, options?.vectorService);

  // Mount API v1 routes
  app.register(createHealthRoutes({ healthService }), { prefix: '/api/v1' });

  // Root health probe convenience route
  app.get('/', async () => ({
    name: 'OmniTutor AI API',
    version: '0.1.0',
    documentation: '/docs',
    endpoints: {
      health: '/api/v1/health',
      ready: '/api/v1/ready',
    },
  }));

  return app;
}
