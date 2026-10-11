import type { IVectorService } from './vector.interface.js';
import { QdrantService } from './qdrant.service.js';
import { env } from '../../config/env.js';

export * from './vector.interface.js';
export * from './qdrant.service.js';
export * from './mock.vector.service.js';

let defaultVectorService: IVectorService | null = null;

export function getVectorService(injected?: IVectorService): IVectorService {
  if (injected) {
    return injected;
  }

  if (!defaultVectorService) {
    defaultVectorService = new QdrantService(env.QDRANT_URL, env.QDRANT_API_KEY);
  }

  return defaultVectorService;
}
