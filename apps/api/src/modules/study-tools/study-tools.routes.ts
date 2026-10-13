import type { FastifyPluginAsync } from 'fastify';
import {
  createStudyNoteSchema,
  updateStudyNoteSchema,
  groundedSummarySchema,
  groundedFlashcardsSchema,
  type ApiResponse,
  type StudyToolNote,
  type GroundedSummaryResponse,
  type GroundedFlashcardsResponse,
} from '@omnitutor/shared';
import type { StudyToolsService } from './study-tools.service.js';

export function createStudyToolsRoutes(deps: {
  studyToolsService: StudyToolsService;
}): FastifyPluginAsync {
  const { studyToolsService } = deps;

  return async (app) => {
    // 1. Generate grounded AI summary
    app.post<{
      Body: unknown;
      Reply: ApiResponse<GroundedSummaryResponse>;
    }>(
      '/study-tools/summaries/generate',
      {
        config: {
          rateLimit: {
            max: 20,
            timeWindow: '1 minute',
          },
        },
        preHandler: [app.authenticate, app.validateCsrf],
      },
      async (req, reply) => {
        const parsed = groundedSummarySchema.parse(req.body);
        const result = await studyToolsService.generateGroundedSummary(
          String(req.user!._id),
          req.user!.role,
          parsed
        );

        return reply.send({
          success: true,
          data: result,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 2. Generate grounded flashcards
    app.post<{
      Body: unknown;
      Reply: ApiResponse<GroundedFlashcardsResponse>;
    }>(
      '/study-tools/flashcards/generate',
      {
        config: {
          rateLimit: {
            max: 20,
            timeWindow: '1 minute',
          },
        },
        preHandler: [app.authenticate, app.validateCsrf],
      },
      async (req, reply) => {
        const parsed = groundedFlashcardsSchema.parse(req.body);
        const result = await studyToolsService.generateGroundedFlashcards(
          String(req.user!._id),
          req.user!.role,
          parsed
        );

        return reply.send({
          success: true,
          data: result,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 3. List saved study notes
    app.get<{
      Querystring: { courseId?: string; category?: string; tag?: string };
      Reply: ApiResponse<StudyToolNote[]>;
    }>(
      '/study-tools/notes',
      {
        preHandler: [app.authenticate],
      },
      async (req, reply) => {
        const notes = await studyToolsService.listNotes(
          String(req.user!._id),
          req.query
        );

        return reply.send({
          success: true,
          data: notes,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 4. Create new study note
    app.post<{
      Body: unknown;
      Reply: ApiResponse<StudyToolNote>;
    }>(
      '/study-tools/notes',
      {
        preHandler: [app.authenticate, app.validateCsrf],
      },
      async (req, reply) => {
        const parsed = createStudyNoteSchema.parse(req.body);
        const note = await studyToolsService.createNote(
          String(req.user!._id),
          parsed as any
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

    // 5. Update study note
    app.patch<{
      Params: { id: string };
      Body: unknown;
      Reply: ApiResponse<StudyToolNote>;
    }>(
      '/study-tools/notes/:id',
      {
        preHandler: [app.authenticate, app.validateCsrf],
      },
      async (req, reply) => {
        const parsed = updateStudyNoteSchema.parse(req.body);
        const note = await studyToolsService.updateNote(
          String(req.user!._id),
          req.params.id,
          parsed
        );

        return reply.send({
          success: true,
          data: note,
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );

    // 6. Delete study note
    app.delete<{
      Params: { id: string };
      Reply: ApiResponse<{ deleted: boolean }>;
    }>(
      '/study-tools/notes/:id',
      {
        preHandler: [app.authenticate, app.validateCsrf],
      },
      async (req, reply) => {
        const deleted = await studyToolsService.deleteNote(
          String(req.user!._id),
          req.params.id
        );

        return reply.send({
          success: true,
          data: { deleted },
          meta: {
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }
    );
  };
}
