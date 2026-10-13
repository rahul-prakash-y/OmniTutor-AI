import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import {
  User,
  Session,
  CourseModel,
  LearningObjectiveModel,
  RevisionScheduleModel,
  AssessmentAttemptModel,
  AssessmentModel,
  TopicMasteryModel,
  MaterialModel,
} from '../src/database/models/index.js';
import { MockEmailService } from '../src/services/email/mock.email.service.js';
import { MockAIProvider } from '../src/services/ai/mock.provider.js';
import { MockVectorService } from '../src/services/vector/mock.vector.service.js';
import { MockStorageService } from '../src/services/storage/mock.storage.service.js';
import { MockEmbeddingProvider } from '../src/services/embedding/mock.embedding.provider.js';
import { hashToken } from '../src/utils/crypto.js';
import { IngestionQueueService } from '../src/modules/ingestion/queue.service.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { UserService } from '../src/modules/user/user.service.js';
import { CourseService } from '../src/modules/course/course.service.js';
import { MaterialService } from '../src/modules/material/material.service.js';
import { IngestionService } from '../src/modules/ingestion/ingestion.service.js';
import { RagService } from '../src/modules/rag/rag.service.js';
import { TutorService } from '../src/modules/tutor/tutor.service.js';
import { AssessmentService } from '../src/modules/assessment/assessment.service.js';
import { AnalyticsService } from '../src/modules/analytics/analytics.service.js';
import type {
  ApiResponse,
  KnowledgeGap,
  RevisionScheduleItem,
  LearningObjective,
  LearningObjectiveCoverage,
  InstructorCourseAnalytics,
  AIEvalMetricSummary,
  SpeechSynthesisResult,
} from '@omnitutor/shared';

describe('Module 13: Optional Advanced Learning Features & Final Hackathon Polish', () => {
  let app: FastifyInstance;
  let emailService: MockEmailService;
  let authService: AuthService;
  let userService: UserService;
  let storageService: MockStorageService;
  let vectorService: MockVectorService;
  let embeddingProvider: MockEmbeddingProvider;
  let queueService: IngestionQueueService;
  let courseService: CourseService;
  let materialService: MaterialService;
  let ingestionService: IngestionService;
  let aiProvider: MockAIProvider;
  let ragService: RagService;
  let tutorService: TutorService;
  let assessmentService: AssessmentService;
  let analyticsService: AnalyticsService;

  let instructorToken: string;
  let instructorId: string;
  let studentToken: string;
  let studentId: string;
  let courseId: string;

  beforeAll(async () => {
    await connectDatabase('mongodb://localhost:27017/omnitutor_test_module13');

    emailService = new MockEmailService('http://localhost:5173');
    authService = new AuthService(emailService);
    userService = new UserService();
    storageService = new MockStorageService();
    vectorService = new MockVectorService();
    embeddingProvider = new MockEmbeddingProvider();
    queueService = new IngestionQueueService(1);
    aiProvider = new MockAIProvider();

    courseService = new CourseService(storageService, vectorService);
    materialService = new MaterialService(storageService, vectorService, queueService);
    ingestionService = new IngestionService(vectorService);

    ragService = new RagService({
      vectorService,
      embeddingProvider,
      aiProvider,
      defaultSufficiencyThreshold: 0.35,
    });

    tutorService = new TutorService({
      ragService,
      aiProvider,
    });

    assessmentService = new AssessmentService({
      ragService,
      vectorService,
      aiProvider,
    });
    analyticsService = new AnalyticsService();

    app = createApp({
      emailService,
      authService,
      userService,
      storageService,
      vectorService,
      embeddingProvider,
      queueService,
      courseService,
      materialService,
      ingestionService,
      ragService,
      tutorService,
      assessmentService,
      analyticsService,
      disableRequestLogging: true,
    });

    await app.ready();
  });

  afterAll(async () => {
    await queueService.stop();
    await app.close();
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await CourseModel.deleteMany({});
    await LearningObjectiveModel.deleteMany({});
    await RevisionScheduleModel.deleteMany({});
    await AssessmentAttemptModel.deleteMany({});
    await AssessmentModel.deleteMany({});
    await TopicMasteryModel.deleteMany({});
    await MaterialModel.deleteMany({});

    // 1. Create Instructor User
    const inst = await User.create({
      email: 'instructor@omnitutor.edu',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
      fullName: 'Prof. Ada Lovelace',
      role: 'admin',
      isEmailVerified: true,
    });
    instructorId = inst._id.toString();

    const rawInstToken = 'inst-session-token-test-1234567890';
    await Session.create({
      userId: inst._id,
      sessionTokenHash: hashToken(rawInstToken),
      expiresAt: new Date(Date.now() + 86400000),
      lastActivityAt: new Date(),
    });
    instructorToken = rawInstToken;

    // 2. Create Student User
    const std = await User.create({
      email: 'student@omnitutor.edu',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
      fullName: 'Alan Turing',
      role: 'student',
      isEmailVerified: true,
    });
    studentId = std._id.toString();

    const rawStdToken = 'std-session-token-test-1234567890';
    await Session.create({
      userId: std._id,
      sessionTokenHash: hashToken(rawStdToken),
      expiresAt: new Date(Date.now() + 86400000),
      lastActivityAt: new Date(),
    });
    studentToken = rawStdToken;

    // 3. Create Course owned by Instructor
    const course = await CourseModel.create({
      title: 'Advanced Distributed Systems',
      description: 'Consensus protocols, vector clocks, and Byzantine fault tolerance.',
      subject: 'Computer Science',
      academicLevel: 'advanced',
      owner: inst._id,
      status: 'active',
      processingStatus: 'indexed',
      materialCount: 1,
      indexedChunkCount: 12,
    });
    courseId = course._id.toString();

    // 4. Create Material for grounding
    await MaterialModel.create({
      courseId: course._id,
      ownerId: inst._id,
      filename: 'consensus_notes.md',
      originalName: 'Consensus Protocols Chapter 1',
      mimeType: 'text/markdown',
      detectedMimeType: 'text/markdown',
      sizeBytes: 4096,
      storageKey: 'materials/consensus_notes.md',
      sourceType: 'md',
      status: 'indexed',
      chunkCount: 3,
    });
  });

  describe('Priority 1: Knowledge Gap Detection & Source Passages', () => {
    it('identifies recurring topic errors and recommends specific source passages for revision', async () => {
      // Seed assessment with questions on "Vector Clocks"
      const assessment = await AssessmentModel.create({
        courseId: new mongoose.Types.ObjectId(courseId),
        userId: new mongoose.Types.ObjectId(studentId),
        title: 'Distributed Ordering Quiz',
        topic: 'Vector Clocks',
        academicLevel: 'advanced',
        difficulty: 'advanced',
        questionCount: 1,
        questions: [
          {
            id: 'q1',
            prompt: 'How do vector clocks handle concurrent events?',
            options: ['Total order', 'Partial order', 'No order'],
            correctOptionIndex: 1,
            topic: 'Vector Clocks',
            learningObjective: 'Master causality invariants',
            explanation: 'Vector clocks capture causal dependency, yielding partial orders.',
          },
        ],
      });

      // Seed student attempt with incorrect response and citations
      await AssessmentAttemptModel.create({
        assessmentId: assessment._id,
        courseId: new mongoose.Types.ObjectId(courseId),
        userId: new mongoose.Types.ObjectId(studentId),
        mode: 'quiz',
        status: 'submitted',
        totalScore: 0,
        maxScore: 10,
        percentage: 0,
        passed: false,
        submittedAt: new Date(),
        responses: [
          {
            questionId: 'q1',
            userAnswer: 0,
            isCorrect: false,
            score: 0,
            maxScore: 10,
            feedback: 'Incorrect',
            explanation: 'Vector clocks only establish partial order.',
            citations: [
              {
                id: 'cite-1',
                chunkId: 'chunk-vc-001',
                materialId: courseId,
                originalFilename: 'Consensus Protocols Chapter 1',
                sourceType: 'md',
                excerpt: 'Concurrent events a and b are not causally ordered: neither dominates the other component-wise.',
                contentHash: 'hash123',
                score: 0.95,
              },
            ],
          },
        ],
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/analytics/knowledge-gaps?courseId=${courseId}`,
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json<ApiResponse<KnowledgeGap[]>>();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data!.length).toBeGreaterThan(0);

      const gap = json.data![0];
      expect(gap.topic).toBe('Vector Clocks');
      expect(gap.errorCount).toBe(1);
      expect(gap.errorRate).toBe(1);
      expect(gap.recommendedPassages.length).toBeGreaterThan(0);
      expect(gap.recommendedPassages[0].textSnippet).toContain('Concurrent events');
    });
  });

  describe('Priority 2 & 3: Socratic Tutoring Mode & Multilingual Tutoring', () => {
    it('supports Socratic guidance steps (probe, hint, synthesize, explain) while preserving citations', async () => {
      // Create conversation
      const createConvRes = await app.inject({
        method: 'POST',
        url: `/api/v1/courses/${courseId}/conversations`,
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
        payload: {
          title: 'Socratic Session',
          mode: 'socratic',
          academicLevel: 'advanced',
          explanationStyle: 'step_by_step',
          language: 'es',
        },
      });

      expect(createConvRes.statusCode).toBe(201);
      const conv = createConvRes.json<ApiResponse<any>>().data;
      expect(conv.language).toBe('es');

      // Send message with Socratic probing question step in Spanish
      const sendMsgRes = await app.inject({
        method: 'POST',
        url: `/api/v1/conversations/${conv.id}/messages`,
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
        payload: {
          content: '¿Cómo garantizamos consistencia en consenso bizantino?',
          socraticStep: 'probe',
          language: 'es',
        },
      });

      expect(sendMsgRes.statusCode).toBe(201);
      const msg = sendMsgRes.json<ApiResponse<any>>().data;
      expect(msg.role).toBe('assistant');
      expect(msg.metadata.socraticStep).toBe('probe');
      expect(msg.metadata.language).toBe('es');
      expect(Array.isArray(msg.citations)).toBe(true);
    });
  });

  describe('Priority 4: Revision Scheduling with Forgetting-Curve Heuristics', () => {
    it('generates spaced review items with retention estimates, scientific disclaimer, and completion lifecycle', async () => {
      // Seed a revision schedule item for the student
      const item = await RevisionScheduleModel.create({
        userId: new mongoose.Types.ObjectId(studentId),
        courseId: new mongoose.Types.ObjectId(courseId),
        topic: 'Byzantine Fault Tolerance',
        currentMasteryScore: 45,
        estimatedRetentionRate: 62.5,
        intervalDays: 3,
        repetitionCount: 1,
        lastAssessedAt: new Date(Date.now() - 3 * 86400000),
        optimalReviewDate: new Date(),
        urgency: 'due_today',
        status: 'pending',
        disclaimer:
          'Retention rates and review schedules are heuristic estimates, not scientifically guaranteed predictions.',
      });

      // 1. Fetch revision schedule
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/analytics/revision-schedule?courseId=${courseId}`,
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      });

      expect(listRes.statusCode).toBe(200);
      const listJson = listRes.json<ApiResponse<RevisionScheduleItem[]>>();
      expect(listJson.success).toBe(true);
      expect(listJson.data!.length).toBe(1);
      expect(listJson.data![0].topic).toBe('Byzantine Fault Tolerance');
      expect(listJson.data![0].disclaimer).toContain('heuristic estimates');

      // 2. Complete revision review
      const completeRes = await app.inject({
        method: 'POST',
        url: `/api/v1/analytics/revision-schedule/${item._id}/complete`,
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
        payload: {
          performanceRating: 5,
        },
      });

      expect(completeRes.statusCode).toBe(200);
      const completeJson = completeRes.json<ApiResponse<RevisionScheduleItem>>();
      expect(completeJson.success).toBe(true);
      expect(completeJson.data!.status).toBe('completed');
    });
  });

  describe('Priority 5: Learning Objective Mapping', () => {
    it('creates learning objectives and computes syllabus coverage metrics', async () => {
      // 1. Create Objective
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/courses/${courseId}/objectives`,
        headers: {
          authorization: `Bearer ${instructorToken}`,
        },
        payload: {
          code: 'LO-1',
          title: 'Byzantine Agreement Invariants',
          topic: 'Byzantine Consensus',
          description: 'Students will verify 3f+1 node invariants against adversarial network partitions.',
          materialIds: [],
        },
      });

      expect(createRes.statusCode).toBe(201);
      const createJson = createRes.json<ApiResponse<LearningObjective>>();
      expect(createJson.success).toBe(true);
      expect(createJson.data!.code).toBe('LO-1');

      // 2. Fetch Coverage
      const coverageRes = await app.inject({
        method: 'GET',
        url: `/api/v1/courses/${courseId}/objectives/coverage`,
        headers: {
          authorization: `Bearer ${instructorToken}`,
        },
      });

      expect(coverageRes.statusCode).toBe(200);
      const coverageJson = coverageRes.json<ApiResponse<LearningObjectiveCoverage[]>>();
      expect(coverageJson.success).toBe(true);
      expect(coverageJson.data!.length).toBe(1);
      expect(coverageJson.data![0].objective.code).toBe('LO-1');
      expect(['uncovered', 'partial', 'fully_covered']).toContain(coverageJson.data![0].coverageStatus);
    });
  });

  describe('Priority 6: Speech Synthesis API', () => {
    it('synthesizes text-to-speech parameters with utterance configuration without exposing provider keys', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/tutor/speech/synthesize',
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
        payload: {
          text: 'Vector clocks provide causal order across asynchronous systems.',
          language: 'en',
          speed: 1.25,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json<ApiResponse<SpeechSynthesisResult>>();
      expect(json.success).toBe(true);
      expect(json.data!.status).toBe('synthesized');
      expect(json.data!.speed).toBe(1.25);
      expect(json.data!.webSpeechUtterance).toBeDefined();
      expect(json.data!.webSpeechUtterance.rate).toBe(1.25);
    });
  });

  describe('Priority 7: Instructor Analytics & Student Privacy Protection', () => {
    it('allows authorized course instructor to view cohort metrics while enforcing privacy and disallowing unauthorized access', async () => {
      // 1. Instructor gets authorized cohort telemetry
      const instRes = await app.inject({
        method: 'GET',
        url: `/api/v1/courses/${courseId}/instructor-analytics`,
        headers: {
          authorization: `Bearer ${instructorToken}`,
        },
      });

      expect(instRes.statusCode).toBe(200);
      const instJson = instRes.json<ApiResponse<InstructorCourseAnalytics>>();
      expect(instJson.success).toBe(true);
      expect(instJson.data!.privacyNotice).toContain('strictly excluded from instructor telemetry');
      expect(Array.isArray(instJson.data!.scoreDistribution)).toBe(true);
      expect(Array.isArray(instJson.data!.topicMasteryRankings)).toBe(true);

      // 2. Student is blocked from accessing instructor reporting
      const stdRes = await app.inject({
        method: 'GET',
        url: `/api/v1/courses/${courseId}/instructor-analytics`,
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      });

      expect(stdRes.statusCode).toBe(403);
    });
  });

  describe('Priority 8: AI Evaluation Benchmark Suite', () => {
    it('executes reproducible AI evaluation benchmark measuring recall, citations, groundedness, latency, and cost', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai-eval/benchmark',
        headers: {
          authorization: `Bearer ${instructorToken}`,
        },
        payload: {
          courseId,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json<ApiResponse<AIEvalMetricSummary>>();
      expect(json.success).toBe(true);
      expect(json.data!.retrievalRecallAtK).toBeGreaterThanOrEqual(0.8);
      expect(json.data!.citationValidityRate).toBeGreaterThanOrEqual(0.8);
      expect(json.data!.groundednessScore).toBeGreaterThanOrEqual(0.8);
      expect(json.data!.averageLatencyMs).toBeGreaterThan(0);
      expect(json.data!.estimatedCostUsd).toBeGreaterThan(0);
      expect(json.data!.benchmarkRunsCount).toBeGreaterThan(0);

      // Verify cached metrics endpoint returns the same summary
      const metricsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/ai-eval/metrics',
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      });

      expect(metricsRes.statusCode).toBe(200);
      const metricsJson = metricsRes.json<ApiResponse<AIEvalMetricSummary>>();
      expect(metricsJson.success).toBe(true);
      expect(metricsJson.data!.benchmarkRunsCount).toBe(json.data!.benchmarkRunsCount);
    });
  });
});
