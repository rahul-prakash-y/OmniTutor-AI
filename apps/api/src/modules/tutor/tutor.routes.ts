import type { FastifyPluginAsync } from 'fastify';
import {
  createConversationSchema,
  updateConversationSchema,
  sendMessageSchema,
  createConceptNoteSchema,
  type ApiResponse,
  type Conversation,
  type ConversationMessage,
  type ConceptNote,
} from '@omnitutor/shared';
import type { TutorService } from './tutor.service.js';

export function createTutorRoutes(deps: { tutorService: TutorService }): FastifyPluginAsync {
  const { tutorService } = deps;

  return async (app) => {
    // 1. Create conversation in course
    app.post<{
      Params: { courseId: string };
      Body: unknown;
      Reply: ApiResponse<Conversation>;
    }>(
      '/courses/:courseId/conversations',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { courseId } = req.params;
        const parsed = createConversationSchema.parse(req.body);

        const conv = await tutorService.createConversation(
          courseId,
          String(req.user!._id),
          req.user!.role,
          parsed
        );

        return reply.status(201).send({
          success: true,
          data: conv,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 2. List conversations in course
    app.get<{
      Params: { courseId: string };
      Querystring: { limit?: string; offset?: string };
      Reply: ApiResponse<{ items: Conversation[]; total: number }>;
    }>(
      '/courses/:courseId/conversations',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { courseId } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;

        const result = await tutorService.listConversations(
          courseId,
          String(req.user!._id),
          req.user!.role,
          limit,
          offset
        );

        return reply.status(200).send({
          success: true,
          data: result,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 3. Get conversation details
    app.get<{
      Params: { conversationId: string };
      Reply: ApiResponse<Conversation>;
    }>(
      '/conversations/:conversationId',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { conversationId } = req.params;
        const conv = await tutorService.getConversation(conversationId, String(req.user!._id), req.user!.role);

        return reply.status(200).send({
          success: true,
          data: conv,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 4. Update conversation
    app.patch<{
      Params: { conversationId: string };
      Body: unknown;
      Reply: ApiResponse<Conversation>;
    }>(
      '/conversations/:conversationId',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { conversationId } = req.params;
        const parsed = updateConversationSchema.parse(req.body);

        const conv = await tutorService.updateConversation(
          conversationId,
          String(req.user!._id),
          req.user!.role,
          parsed
        );

        return reply.status(200).send({
          success: true,
          data: conv,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 5. Delete conversation
    app.delete<{
      Params: { conversationId: string };
      Reply: ApiResponse<{ deleted: boolean }>;
    }>(
      '/conversations/:conversationId',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { conversationId } = req.params;
        await tutorService.deleteConversation(conversationId, String(req.user!._id), req.user!.role);

        return reply.status(200).send({
          success: true,
          data: { deleted: true },
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 6. Fetch conversation messages
    app.get<{
      Params: { conversationId: string };
      Querystring: { limit?: string; offset?: string };
      Reply: ApiResponse<{ items: ConversationMessage[]; total: number }>;
    }>(
      '/conversations/:conversationId/messages',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { conversationId } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;

        const result = await tutorService.getMessages(
          conversationId,
          String(req.user!._id),
          req.user!.role,
          limit,
          offset
        );

        return reply.status(200).send({
          success: true,
          data: result,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 7. Send message to conversation
    app.post<{
      Params: { conversationId: string };
      Body: unknown;
      Reply: ApiResponse<ConversationMessage>;
    }>(
      '/conversations/:conversationId/messages',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { conversationId } = req.params;
        const parsed = sendMessageSchema.parse(req.body);

        const msg = await tutorService.sendMessage(
          conversationId,
          String(req.user!._id),
          req.user!.role,
          parsed
        );

        return reply.status(201).send({
          success: true,
          data: msg,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 8. Stream message endpoint (SSE)
    app.post<{
      Params: { conversationId: string };
      Body: unknown;
    }>(
      '/conversations/:conversationId/messages/stream',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { conversationId } = req.params;
        const parsed = sendMessageSchema.parse(req.body);

        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');
        reply.raw.flushHeaders?.();

        try {
          // Process message and return completion
          const assistantMsg = await tutorService.sendMessage(
            conversationId,
            String(req.user!._id),
            req.user!.role,
            parsed
          );

          // Stream full content in chunks for client typing effect
          const words = assistantMsg.content.split(' ');
          for (let i = 0; i < words.length; i += 3) {
            const chunk = words.slice(i, i + 3).join(' ') + ' ';
            reply.raw.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
          }

          // Emit complete message event with citations
          reply.raw.write(
            `data: ${JSON.stringify({
              type: 'done',
              message: assistantMsg,
              citations: assistantMsg.citations,
            })}\n\n`
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Streaming generation error';
          reply.raw.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
        } finally {
          reply.raw.end();
        }
      }
    );

    // 9. Regenerate message
    app.post<{
      Params: { conversationId: string; messageId: string };
      Body: { academicLevel?: any; explanationStyle?: any };
      Reply: ApiResponse<ConversationMessage>;
    }>(
      '/conversations/:conversationId/messages/:messageId/regenerate',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { conversationId, messageId } = req.params;
        const msg = await tutorService.regenerateMessage(
          conversationId,
          messageId,
          String(req.user!._id),
          req.user!.role,
          req.body
        );

        return reply.status(200).send({
          success: true,
          data: msg,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 10. Concept Notes
    app.post<{
      Params: { courseId: string };
      Body: unknown;
      Reply: ApiResponse<ConceptNote>;
    }>(
      '/courses/:courseId/notes',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { courseId } = req.params;
        const parsed = createConceptNoteSchema.parse(req.body);

        const note = await tutorService.saveConceptNote(
          courseId,
          String(req.user!._id),
          req.user!.role,
          parsed
        );

        return reply.status(201).send({
          success: true,
          data: note,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    app.get<{
      Params: { courseId: string };
      Reply: ApiResponse<ConceptNote[]>;
    }>(
      '/courses/:courseId/notes',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { courseId } = req.params;
        const notes = await tutorService.listConceptNotes(courseId, String(req.user!._id), req.user!.role);

        return reply.status(200).send({
          success: true,
          data: notes,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    app.delete<{
      Params: { courseId: string; noteId: string };
      Reply: ApiResponse<{ deleted: boolean }>;
    }>(
      '/courses/:courseId/notes/:noteId',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { noteId } = req.params;
        await tutorService.deleteConceptNote(noteId, String(req.user!._id), req.user!.role);

        return reply.status(200).send({
          success: true,
          data: { deleted: true },
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    app.delete<{
      Params: { noteId: string };
      Reply: ApiResponse<{ deleted: boolean }>;
    }>(
      '/notes/:noteId',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const { noteId } = req.params;
        await tutorService.deleteConceptNote(noteId, String(req.user!._id), req.user!.role);

        return reply.status(200).send({
          success: true,
          data: { deleted: true },
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );
  };
}
