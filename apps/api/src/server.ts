import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';

async function bootstrap() {
  logger.info('🚀 Starting OmniTutor AI Backend API...');

  // Initialize Fastify app
  const app = createApp();

  // Connect to MongoDB
  try {
    await connectDatabase(env.MONGODB_URI);
  } catch (err) {
    logger.warn({ err }, 'MongoDB connection initialization warning');
  }

  // Graceful shutdown handling
  let isShuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);

    const shutdownTimeout = setTimeout(() => {
      logger.error('Shutdown timed out after 10s. Force exiting.');
      process.exit(1);
    }, 10000);

    try {
      await app.close();
      logger.info('Fastify server closed.');
      await disconnectDatabase();
      logger.info('MongoDB connections closed.');
      clearTimeout(shutdownTimeout);
      logger.info('Graceful shutdown completed successfully.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during graceful shutdown');
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled Rejection detected');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught Exception detected. Shutting down...');
    gracefulShutdown('uncaughtException');
  });

  try {
    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    logger.info(`📡 OmniTutor AI API listening on ${address}`);
    logger.info(`🔍 Health check: ${address}/api/v1/health`);
    logger.info(`🔍 Readiness check: ${address}/api/v1/ready`);
  } catch (err) {
    logger.fatal({ err }, 'Failed to start API server');
    process.exit(1);
  }
}

bootstrap();
