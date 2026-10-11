import { describe, it, expect } from 'vitest';
import { GeminiProvider } from '../src/services/ai/gemini.provider.js';
import { MockAIProvider } from '../src/services/ai/mock.provider.js';
import { MockVectorService } from '../src/services/vector/mock.vector.service.js';
import { ServiceUnavailableError } from '../src/utils/errors.js';

describe('Service Layer Abstractions', () => {
  describe('GeminiProvider', () => {
    it('Reports degraded status when GEMINI_API_KEY is not configured', async () => {
      const unconfiguredProvider = new GeminiProvider(undefined);
      expect(unconfiguredProvider.isConfigured()).toBe(false);

      const health = await unconfiguredProvider.checkHealth();
      expect(health.status).toBe('degraded');
      expect(health.message).toContain('GEMINI_API_KEY is not configured');
    });

    it('Throws ServiceUnavailableError when attempting completion without API key', async () => {
      const unconfiguredProvider = new GeminiProvider('');
      await expect(
        unconfiguredProvider.generateCompletion([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow(ServiceUnavailableError);
    });
  });

  describe('MockAIProvider', () => {
    it('Generates completion response with token usage metrics', async () => {
      const mock = new MockAIProvider({ customResponse: 'Custom tutoring guidance' });
      const result = await mock.generateCompletion([{ role: 'user', content: 'What is calculus?' }]);

      expect(result.text).toBe('Custom tutoring guidance');
      expect(result.tokensUsed?.totalTokens).toBeGreaterThan(0);
    });

    it('Fails gracefully when error simulation is enabled', async () => {
      const failingMock = new MockAIProvider({ shouldFail: true });
      await expect(
        failingMock.generateCompletion([{ role: 'user', content: 'Test' }])
      ).rejects.toThrow('Simulated AI provider error');

      const health = await failingMock.checkHealth();
      expect(health.status).toBe('unhealthy');
    });
  });

  describe('MockVectorService', () => {
    it('Manages collections, upserts points, and returns search results', async () => {
      const vectorService = new MockVectorService();
      const collectionCreated = await vectorService.createCollectionIfNotExists('test-collection');
      expect(collectionCreated).toBe(true);

      const upserted = await vectorService.upsertPoints('test-collection', [
        { id: '1', vector: [0.1, 0.2, 0.3], payload: { topic: 'math' } },
        { id: '2', vector: [0.2, 0.3, 0.4], payload: { topic: 'physics' } },
      ]);
      expect(upserted).toBe(true);

      const results = await vectorService.search('test-collection', [0.1, 0.2, 0.3], 2);
      expect(results).toHaveLength(2);
      expect(results[0]?.payload.topic).toBe('math');
    });
  });
});
