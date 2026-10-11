import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import {
  User,
  Session,
  CourseModel,
  MaterialModel,
  LearningEventModel,
  TopicMasteryModel,
  StudyGoalModel,
  StudyPlanModel,
  AssessmentAttemptModel,
} from '../src/database/models/index.js';
import { MockEmailService } from '../src/services/email/mock.email.service.js';
import { MockAIProvider } from '../src/services/ai/mock.provider.js';
import { MockVectorService } from '../src/services/vector/mock.vector.service.js';
import { MockStorageService } from '../src/services/storage/mock.storage.service.js';
import { MockEmbeddingProvider } from '../src/services/embedding/mock.embedding.provider.js';
import { IngestionQueueService } from '../src/modules/ingestion/queue.service.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { UserService } from '../src/modules/user/user.service.js';
import { CourseService } from '../src/modules/course/course.service.js';
import { MaterialService } from '../src/modules/material/material.service.js';
import { IngestionService } from '../src/modules/ingestion/ingestion.service.js';
import { AnalyticsService } from '../src/modules/analytics/analytics.service.js';
import type {
  ApiResponse,
  StudentAnalyticsSummary,
  TopicMasteryAnalytics,
  StudyRecommendation,
  StudyGoal,
  StudyPlan,
  LearningEvent,
} from '@omnitutor/shared';

describe('Module 9: Learning Analytics, Streaks & Personalized Study Plans Tests', () => {
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
  let analyticsService: AnalyticsService;

  beforeAll(async () => {
    await connectDatabase('mongodb://localhost:27017/omnitutor_test_analytics');

    emailService = new MockEmailService('http://localhost:5173');
    authService = new AuthService(emailService);
    userService = new UserService();
    storageService = new MockStorageService();
    vectorService = new MockVectorService();
    embeddingProvider = new MockEmbeddingProvider();
    queueService = new IngestionQueueService(1);
    courseService = new CourseService(storageService, vectorService);
    materialService = new MaterialService(storageService, vectorService, queueService);
    ingestionService = new IngestionService(vectorService);
    aiProvider = new MockAIProvider();
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
      aiProvider,
      analyticsService,
      disableRequestLogging: true,
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await CourseModel.deleteMany({});
    await MaterialModel.deleteMany({});
    await LearningEventModel.deleteMany({});
    await TopicMasteryModel.deleteMany({});
    await StudyGoalModel.deleteMany({});
    await StudyPlanModel.deleteMany({});
    await AssessmentAttemptModel.deleteMany({});
  });

  function extractCookie(headers: Record<string, string | string[] | undefined>): string {
    const raw = headers['set-cookie'];
    if (!raw) return '';
    const cookieStr = Array.isArray(raw) ? raw[0] : raw;
    const match = cookieStr?.match(/session_token=([^;]+)/);
    return match ? match[1]! : '';
  }

  async function registerAndLoginUser(email = 'student@omnitutor.ai', name = 'Alice Student') {
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'Password123!', fullName: name },
    });
    const regBody = JSON.parse(regRes.payload);

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'Password123!' },
    });

    const user = await User.findById(regBody.data.user.id);

    return {
      user: user!,
      sessionToken: extractCookie(loginRes.headers),
    };
  }

  it('aggregates questions attempted, accuracy rate, and active study time from reliable events', async () => {
    const { user, sessionToken } = await registerAndLoginUser();

    const course = await CourseModel.create({
      title: 'Distributed Systems 101',
      description: 'Foundations of distributed consensus, state machines and replication protocols.',
      subject: 'computer_science',
      academicLevel: 'undergraduate',
      owner: user._id,
      status: 'active',
      tags: ['distributed', 'consensus'],
    });

    // Seed assessment attempts
    await AssessmentAttemptModel.create({
      assessmentId: new mongoose.Types.ObjectId(),
      courseId: course._id,
      userId: user._id,
      mode: 'quiz',
      status: 'submitted',
      totalScore: 8,
      maxScore: 10,
      percentage: 80,
      passed: true,
      responses: [
        { questionId: 'q1', userAnswer: 'A', isCorrect: true, score: 2, maxScore: 2, feedback: 'Correct', explanation: '' },
        { questionId: 'q2', userAnswer: 'B', isCorrect: true, score: 2, maxScore: 2, feedback: 'Correct', explanation: '' },
        { questionId: 'q3', userAnswer: 'C', isCorrect: true, score: 2, maxScore: 2, feedback: 'Correct', explanation: '' },
        { questionId: 'q4', userAnswer: 'D', isCorrect: true, score: 2, maxScore: 2, feedback: 'Correct', explanation: '' },
        { questionId: 'q5', userAnswer: 'wrong', isCorrect: false, score: 0, maxScore: 2, feedback: 'Wrong', explanation: '' },
      ],
      startedAt: new Date(Date.now() - 3600000),
      submittedAt: new Date(),
    });

    // Seed active learning events
    await LearningEventModel.create({
      userId: user._id,
      eventType: 'active_study_session',
      courseId: course._id,
      durationSeconds: 1800, // 30 minutes
      timestamp: new Date(),
    });

    await LearningEventModel.create({
      userId: user._id,
      eventType: 'tutor_interaction',
      courseId: course._id,
      durationSeconds: 900, // 15 minutes
      timestamp: new Date(),
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/summary',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<StudentAnalyticsSummary> = res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalQuestionsAttempted).toBe(5);
    expect(body.data.totalQuestionsCorrect).toBe(4);
    expect(body.data.overallAccuracy).toBe(80);
    expect(body.data.activeStudyTimeMinutes).toBe(45); // 1800s + 900s = 2700s = 45 mins
    expect(body.data.inProgressCoursesCount).toBe(1);
  });

  it('calculates calendar day streaks accurately, respecting timezones and day gaps', async () => {
    const { user, sessionToken } = await registerAndLoginUser('streak@omnitutor.ai', 'Streak Student');

    // Today, yesterday, and 2 days ago active events => 3-day continuous streak
    const now = new Date();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    await LearningEventModel.create([
      { userId: user._id, eventType: 'material_view', durationSeconds: 300, timestamp: tenDaysAgo },
      { userId: user._id, eventType: 'tutor_interaction', durationSeconds: 600, timestamp: twoDaysAgo },
      { userId: user._id, eventType: 'assessment_submission', durationSeconds: 900, timestamp: oneDayAgo },
      { userId: user._id, eventType: 'active_study_session', durationSeconds: 1200, timestamp: now },
    ]);

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/summary?timezone=UTC',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<StudentAnalyticsSummary> = res.json();
    expect(body.data.currentStreakDays).toBe(3);
    expect(body.data.longestStreakDays).toBe(3);
  });

  it('enforces idempotent event processing to prevent double-counting active learning time', async () => {
    const { user, sessionToken } = await registerAndLoginUser('idempotent@omnitutor.ai', 'Idem Student');

    const idempotencyKey = `quiz-submit-${Date.now()}-abc`;

    // First submission
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
      payload: {
        eventType: 'assessment_submission',
        durationSeconds: 600, // 10 minutes
        idempotencyKey,
      },
    });

    expect(res1.statusCode).toBe(201);

    // Duplicate submission with same idempotency key
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
      payload: {
        eventType: 'assessment_submission',
        durationSeconds: 600,
        idempotencyKey,
      },
    });

    expect(res2.statusCode).toBe(201);

    // Only one event should exist in database
    const events = await LearningEventModel.find({ userId: user._id });
    expect(events.length).toBe(1);

    // Active minutes must remain 10, not 20
    const summary = await analyticsService.getStudentSummary(user._id.toString());
    expect(summary.activeStudyTimeMinutes).toBe(10);
  });

  it('caps durationSeconds to prevent treating idle open browser tabs as active study time', async () => {
    const { sessionToken } = await registerAndLoginUser('capped@omnitutor.ai', 'Capped Student');

    // Student claims an event took 24 hours (86400 seconds) - must be rejected or capped to max 7200s (2 hrs)
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/events',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
      payload: {
        eventType: 'active_study_session',
        durationSeconds: 999999, // Exceeds Zod max (7200)
      },
    });

    expect(res.statusCode).toBe(400); // Rejected by validation schema
  });

  it('generates personalized recommendations with explicit reasons for weak topics and learning gaps', async () => {
    const { user, sessionToken } = await registerAndLoginUser('weak@omnitutor.ai', 'Weak Student');

    const course = await CourseModel.create({
      title: 'Advanced Machine Learning',
      description: 'Neural networks, optimization dynamics and representation learning principles.',
      subject: 'computer_science',
      academicLevel: 'graduate',
      owner: user._id,
      status: 'active',
      tags: ['ai', 'deep-learning'],
    });

    const material = await MaterialModel.create({
      courseId: course._id,
      ownerId: user._id,
      filename: 'backprop_math.pdf',
      originalName: 'Backpropagation Mathematical Foundations.pdf',
      mimeType: 'application/pdf',
      detectedMimeType: 'application/pdf',
      sizeBytes: 10240,
      storageKey: 'storage/backprop.pdf',
      sourceType: 'pdf',
      status: 'indexed',
      chunkCount: 8,
      retryCount: 0,
      metadata: { pageCount: 12 },
    });

    // Record low mastery on "Gradient Descent"
    await TopicMasteryModel.create({
      courseId: course._id,
      userId: user._id,
      topic: 'Gradient Descent Optimization',
      masteryScore: 32, // Low mastery < 45
      attemptCount: 5,
      correctCount: 1,
      currentDifficulty: 'intermediate',
      streakCount: -2,
      recommendedRevision: true,
      revisionReason: 'Accuracy on Gradient Descent dropped to 20% across last 5 questions.',
      lastAssessedAt: new Date(),
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/recommendations',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<StudyRecommendation[]> = res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(2);

    const weakTopicRec = body.data.find((r) => r.type === 'weak_topic');
    expect(weakTopicRec).toBeDefined();
    expect(weakTopicRec?.title).toContain('Gradient Descent Optimization');
    expect(weakTopicRec?.reason).toContain('Accuracy on Gradient Descent dropped to 20%');

    const materialRec = body.data.find((r) => r.type === 'material_gap');
    expect(materialRec).toBeDefined();
    expect(materialRec?.materialId).toBe(material._id.toString());
  });

  it('generates a personalized study plan and allows updating milestone completion', async () => {
    const { user, sessionToken } = await registerAndLoginUser('studyplan@omnitutor.ai', 'Plan Student');

    const course = await CourseModel.create({
      title: 'Database Internals & Storage Engines',
      description: 'LSM trees, B-trees, WAL logs, buffer pools, and lock management.',
      subject: 'computer_science',
      academicLevel: 'undergraduate',
      owner: user._id,
      status: 'active',
      tags: ['db', 'storage'],
    });

    await MaterialModel.create({
      courseId: course._id,
      ownerId: user._id,
      filename: 'btree.pdf',
      originalName: 'B-Tree Implementation Guide.pdf',
      mimeType: 'application/pdf',
      detectedMimeType: 'application/pdf',
      sizeBytes: 15000,
      storageKey: 'storage/btree.pdf',
      sourceType: 'pdf',
      status: 'indexed',
      chunkCount: 6,
      retryCount: 0,
      metadata: { pageCount: 15 },
    });

    // Generate study plan
    const genRes = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/study-plan/generate',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
      payload: {
        courseId: course._id.toString(),
        weeklyAvailableHours: 8,
        targetWeeks: 4,
        scheduleType: 'weekly',
      },
    });

    expect(genRes.statusCode).toBe(201);
    const genBody: ApiResponse<StudyPlan> = genRes.json();
    expect(genBody.data.milestones.length).toBe(4);
    expect(genBody.data.weeklyAvailableHours).toBe(8);

    const firstMilestone = genBody.data.milestones[0];
    expect(firstMilestone).toBeDefined();

    // Complete the first milestone
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/analytics/study-plan/${genBody.data.id}/milestones/${firstMilestone!.id}`,
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
      payload: {
        completed: true,
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updateBody: ApiResponse<StudyPlan> = updateRes.json();
    const updatedMilestone = updateBody.data.milestones.find((m) => m.id === firstMilestone!.id);
    expect(updatedMilestone?.completed).toBe(true);
    expect(updatedMilestone?.completedAt).toBeDefined();
  });

  it('enforces student-level data access and cross-user isolation', async () => {
    const student1 = await registerAndLoginUser('student1@omnitutor.ai', 'Student One');
    const student2 = await registerAndLoginUser('student2@omnitutor.ai', 'Student Two');

    // Create private event for student 1
    await LearningEventModel.create({
      userId: student1.user._id,
      eventType: 'tutor_interaction',
      durationSeconds: 1200,
      timestamp: new Date(),
    });

    // Student 2 accesses activity history
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/activity',
      headers: {
        cookie: `session_token=${student2.sessionToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    // Student 2 should see 0 items
    expect(body.data.items.length).toBe(0);
    expect(body.data.total).toBe(0);
  });
});
