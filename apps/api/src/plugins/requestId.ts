import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { randomUUID } from 'crypto';

declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

const plugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    request.startTime = Date.now();
    const existingId = request.headers['x-request-id'];
    const requestId =
      typeof existingId === 'string' && existingId.trim() !== ''
        ? existingId
        : randomUUID();

    request.headers['x-request-id'] = requestId;
    reply.header('x-request-id', requestId);
  });
};

export const requestIdPlugin = fp(plugin, {
  name: 'requestIdPlugin',
  fastify: '5.x',
});
