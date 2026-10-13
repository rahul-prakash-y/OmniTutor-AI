import fastify from 'fastify';
import pino from 'pino';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { requestIdPlugin } from './plugins/requestId.js';
import { errorHandlerPlugin } from './plugins/errorHandler.js';
import { authPlugin } from './plugins/auth.js';
import { createHealthRoutes } from './modules/health/health.routes.js';
import { HealthService } from './modules/health/health.service.js';
import { createAuthRoutes } from './modules/auth/auth.routes.js';
import { AuthService } from './modules/auth/auth.service.js';
import { createUserRoutes } from './modules/user/user.routes.js';
import { UserService } from './modules/user/user.service.js';
import { createCourseRoutes } from './modules/course/course.routes.js';
import { CourseService } from './modules/course/course.service.js';
import { createMaterialRoutes } from './modules/material/material.routes.js';
import { MaterialService } from './modules/material/material.service.js';
import { createIngestionRoutes } from './modules/ingestion/ingestion.routes.js';
import { IngestionService } from './modules/ingestion/ingestion.service.js';
import { IngestionWorker } from './modules/ingestion/ingestion.worker.js';
import { IngestionQueueService } from './modules/ingestion/queue.service.js';
import { MockEmailService } from './services/email/mock.email.service.js';
import { getVectorService, type IVectorService } from './services/vector/index.js';
import {
  GeminiEmbeddingProvider,
  MockEmbeddingProvider,
  type IEmbeddingProvider,
} from './services/embedding/index.js';
import {
  LocalStorageService,
  type IStorageService,
} from './services/storage/index.js';
import { getAIProvider, type IAIProvider } from './services/ai/index.js';
import { RagService } from './modules/rag/rag.service.js';
import { createRagRoutes } from './modules/rag/rag.routes.js';
import { TutorService } from './modules/tutor/tutor.service.js';
import { createTutorRoutes } from './modules/tutor/tutor.routes.js';
import { AssessmentService } from './modules/assessment/assessment.service.js';
import { createAssessmentRoutes } from './modules/assessment/assessment.routes.js';
import { AnalyticsService } from './modules/analytics/analytics.service.js';
import { createAnalyticsRoutes } from './modules/analytics/analytics.routes.js';
import { SearchService } from './modules/search/search.service.js';
import { createSearchRoutes } from './modules/search/search.routes.js';
import { MaterialViewerService } from './modules/material-viewer/material-viewer.service.js';
import { createMaterialViewerRoutes } from './modules/material-viewer/material-viewer.routes.js';
import { StudyToolsService } from './modules/study-tools/study-tools.service.js';
import { createStudyToolsRoutes } from './modules/study-tools/study-tools.routes.js';
import { AIEvalService } from './modules/ai-eval/ai-eval.service.js';
import { createAIEvalRoutes } from './modules/ai-eval/ai-eval.routes.js';


export interface AppOptions {
  aiProvider?: IAIProvider;
  vectorService?: IVectorService;
  storageService?: IStorageService;
  embeddingProvider?: IEmbeddingProvider;
  queueService?: IngestionQueueService;
  healthService?: HealthService;
  emailService?: MockEmailService;
  authService?: AuthService;
  userService?: UserService;
  courseService?: CourseService;
  materialService?: MaterialService;
  ingestionService?: IngestionService;
  ragService?: RagService;
  tutorService?: TutorService;
  assessmentService?: AssessmentService;
  analyticsService?: AnalyticsService;
  searchService?: SearchService;
  materialViewerService?: MaterialViewerService;
  studyToolsService?: StudyToolsService;
  disableRequestLogging?: boolean;
}

export function createApp(options?: AppOptions) {
  const silentLogger = pino({ level: 'silent' });
  const appLogger = options?.disableRequestLogging ? silentLogger : logger;

  const app = fastify({
    loggerInstance: appLogger,
    bodyLimit: 100 * 1024 * 1024,
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

  app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    allowList: () => env.NODE_ENV === 'test',
  });

  // Streaming multipart file uploads with 100MB limit
  app.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024,
      files: 1,
    },
  });

  app.register(sensible);
  app.register(requestIdPlugin);
  app.register(errorHandlerPlugin);
  app.register(authPlugin);

  // Vector service
  const vectorService = options?.vectorService || getVectorService();

  // Storage service
  const storageService = options?.storageService || new LocalStorageService();

  // Embedding provider
  const embeddingProvider =
    options?.embeddingProvider ||
    (env.GEMINI_API_KEY
      ? new GeminiEmbeddingProvider(env.GEMINI_API_KEY)
      : new MockEmbeddingProvider());

  // Ingestion Queue and Worker
  const queueService = options?.queueService || new IngestionQueueService(2);
  const ingestionWorker = new IngestionWorker({
    storage: storageService,
    embeddings: embeddingProvider,
    vectors: vectorService,
    queue: queueService,
    geminiApiKey: env.GEMINI_API_KEY,
  });

  // Start background worker loop if queue is internally created
  if (!options?.queueService) {
    queueService.start();
  }

  // Reconcile any orphaned ingestion records from unexpected restarts
  if (!options?.queueService && env.NODE_ENV !== 'test') {
    void ingestionWorker.reconcileOrphanedJobs();
  }

  const aiProvider = options?.aiProvider || getAIProvider();

  // Health service with injected dependencies if provided
  const healthService =
    options?.healthService ||
    new HealthService(aiProvider, vectorService);

  // Email service
  const emailService = options?.emailService || new MockEmailService(env.APP_URL);

  // Auth, User, Course, Material, and Ingestion services
  const authService = options?.authService || new AuthService(emailService);
  const userService = options?.userService || new UserService();
  const courseService =
    options?.courseService || new CourseService(storageService, vectorService);
  const materialService =
    options?.materialService ||
    new MaterialService(storageService, vectorService, queueService);
  const ingestionService =
    options?.ingestionService || new IngestionService(vectorService);

  // Module 6, 7 & 8: RAG, AI Tutor, and Adaptive Assessment services
  const ragService =
    options?.ragService ||
    new RagService({
      vectorService,
      embeddingProvider,
      aiProvider,
    });

  const tutorService =
    options?.tutorService ||
    new TutorService({
      ragService,
      aiProvider,
    });

  const assessmentService =
    options?.assessmentService ||
    new AssessmentService({
      ragService,
      vectorService,
      aiProvider,
    });

  const analyticsService =
    options?.analyticsService || new AnalyticsService();

  const searchService =
    options?.searchService || new SearchService(vectorService, embeddingProvider);

  const materialViewerService =
    options?.materialViewerService || new MaterialViewerService();

  const studyToolsService =
    options?.studyToolsService || new StudyToolsService(ragService, aiProvider);

  // Mount API v1 routes
  app.register(createHealthRoutes({ healthService }), { prefix: '/api/v1' });
  app.register(createAuthRoutes({ authService, emailService }), { prefix: '/api/v1' });
  app.register(createUserRoutes({ userService }), { prefix: '/api/v1' });
  app.register(createCourseRoutes({ courseService }), { prefix: '/api/v1' });
  app.register(createMaterialRoutes({ materialService }), { prefix: '/api/v1' });
  app.register(
    createIngestionRoutes({ ingestionService, queueService }),
    { prefix: '/api/v1' }
  );
  app.register(createRagRoutes({ ragService }), { prefix: '/api/v1' });
  app.register(createTutorRoutes({ tutorService }), { prefix: '/api/v1' });
  app.register(createAssessmentRoutes({ assessmentService }), { prefix: '/api/v1' });
  app.register(createAnalyticsRoutes({ analyticsService }), { prefix: '/api/v1' });
  app.register(createSearchRoutes({ searchService }), { prefix: '/api/v1' });
  app.register(createMaterialViewerRoutes({ materialViewerService }), { prefix: '/api/v1' });
  app.register(createStudyToolsRoutes({ studyToolsService }), { prefix: '/api/v1' });

  // Module 13 Priority 8: AI Evaluation Benchmark & Groundedness Dashboard
  const aiEvalService = new AIEvalService({ ragService, aiProvider });
  app.register(createAIEvalRoutes({ aiEvalService }), { prefix: '/api/v1' });


  // Root health probe convenience route
  app.get('/', async () => ({
    name: 'OmniTutor AI API',
    version: '0.1.0',
    documentation: '/docs',
    endpoints: {
      health: '/api/v1/health',
      ready: '/api/v1/ready',
      auth: {
        register: '/api/v1/auth/register',
        login: '/api/v1/auth/login',
        logout: '/api/v1/auth/logout',
        me: '/api/v1/auth/me',
      },
      courses: {
        list: '/api/v1/courses',
        create: '/api/v1/courses',
        details: '/api/v1/courses/:courseId',
      },
      materials: {
        upload: '/api/v1/courses/:courseId/materials/upload',
        list: '/api/v1/courses/:courseId/materials',
      },
      ingestion: {
        status: '/api/v1/ingestion/jobs/:jobId',
        preview: '/api/v1/courses/:courseId/materials/:materialId/preview',
      },
    },
  }));

  // Clean shutdown hook
  app.addHook('onClose', async () => {
    await queueService.stop();
  });

  return app;
}
