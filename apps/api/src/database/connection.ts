import mongoose from 'mongoose';
import { logger } from '../config/logger.js';

let isConnecting = false;

export async function connectDatabase(uri: string): Promise<boolean> {
  if (mongoose.connection.readyState === 1) {
    logger.debug('MongoDB already connected');
    return true;
  }

  if (isConnecting) {
    logger.debug('MongoDB connection already in progress');
    return false;
  }

  isConnecting = true;

  mongoose.connection.on('connected', () => {
    logger.info('✅ MongoDB connection established successfully');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, '❌ MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('⚠️ MongoDB disconnected');
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 5000,
    });
    isConnecting = false;
    return true;
  } catch (err) {
    isConnecting = false;
    logger.warn({ err }, '⚠️ Could not connect to MongoDB on startup. Application running in degraded database mode.');
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    logger.info('Closing MongoDB connection...');
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function checkDatabaseLatency(): Promise<{ connected: boolean; latencyMs: number }> {
  if (!isDatabaseConnected() || !mongoose.connection.db) {
    return { connected: false, latencyMs: 0 };
  }

  const start = Date.now();
  try {
    await mongoose.connection.db.admin().ping();
    const latencyMs = Date.now() - start;
    return { connected: true, latencyMs };
  } catch (err) {
    logger.warn({ err }, 'MongoDB ping failed');
    return { connected: false, latencyMs: Date.now() - start };
  }
}
