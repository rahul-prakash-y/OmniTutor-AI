import type { IAIProvider } from './ai.interface.js';
import { GeminiProvider } from './gemini.provider.js';
import { env } from '../../config/env.js';

export * from './ai.interface.js';
export * from './gemini.provider.js';
export * from './mock.provider.js';

let defaultAIProvider: IAIProvider | null = null;

export function getAIProvider(injected?: IAIProvider): IAIProvider {
  if (injected) {
    return injected;
  }

  if (!defaultAIProvider) {
    defaultAIProvider = new GeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL);
  }

  return defaultAIProvider;
}
