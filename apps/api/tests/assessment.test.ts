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
  AssessmentModel,
  AssessmentAttemptModel,
  TopicMasteryModel,
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
import { RagService } from '../src/modules/rag/rag.service.js';
import { AssessmentService } from '../src/modules/assessment/assessment.service.js';
import { MATERIALS_COLLECTION } from '../src/modules/ingestion/ingestion.worker.js';
import type {
  ApiResponse,
  Assessment,
  AssessmentAttempt,
  TopicMastery,
} from '@omnitutor/shared';

describe('Module 8: Dynamic Adaptive Assessments & Server-Side Evaluation Tests', () => {
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
  let assessmentService: AssessmentService;

  beforeAll(async () => {
    await connectDatabase('mongodb://localhost:27017/omnitutor_test_assessment');

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

    assessmentService = new AssessmentService({
      ragService,
      vectorService,
      aiProvider,
    });

    app = createApp({
      aiProvider,
      vectorService,
      storageService,
      embeddingProvider,
      queueService,
      emailService,
      authService,
      userService,
      courseService,
      materialService,
      ingestionService,
      ragService,
      assessmentService,
      disableRequestLogging: true,
    });

    await app.ready();
    await vectorService.createCollectionIfNotExists(MATERIALS_COLLECTION);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
      await Session.deleteMany({});
      await CourseModel.deleteMany({});
      await MaterialModel.deleteMany({});
      await AssessmentModel.deleteMany({});
      await AssessmentAttemptModel.deleteMany({});
      await TopicMasteryModel.deleteMany({});
      await disconnectDatabase();
    }
    await app.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await CourseModel.deleteMany({});
    await MaterialModel.deleteMany({});
    await AssessmentModel.deleteMany({});
    await AssessmentAttemptModel.deleteMany({});
    await TopicMasteryModel.deleteMany({});
    storageService.clear();
    aiProvider.setShouldFail(false);
  });

  function extractCookie(headers: Record<string, string | string[] | undefined>): string {
    const raw = headers['set-cookie'];
    if (!raw) return '';
    const cookieStr = Array.isArray(raw) ? raw[0] : raw;
    const match = cookieStr?.match(/session_token=([^;]+)/);
    return match ? match[1]! : '';
  }

  async function registerAndLoginUser(email: string, name: string) {
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

    return {
      userId: regBody.data.user.id,
      sessionToken: extractCookie(loginRes.headers),
    };
  }

  it('rejects assessment generation when course has no indexed materials', async () => {
    const student = await registerAndLoginUser('student_empty@omnitutor.ai', 'Student Empty');
    const course = await CourseModel.create({
      title: 'Empty Course',
      subject: 'Computer Science',
      description: 'Course with no uploaded or indexed curriculum files',
      owner: new mongoose.Types.ObjectId(student.userId),
      indexedChunkCount: 0,
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${course.id}/assessments/generate`,
      headers: { cookie: `session_token=${student.sessionToken}` },
      payload: {
        mode: 'quiz',
        questionCount: 5,
        difficulty: 'intermediate',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('does not have any successfully indexed materials yet');
  });

  it('generates assessment and strips answer keys & explanations from student view before submission', async () => {
    const student = await registerAndLoginUser('student_gen@omnitutor.ai', 'Student Gen');
    const course = await CourseModel.create({
      title: 'Operating Systems Concepts',
      subject: 'Computer Science',
      description: 'Processes, threads, synchronization and deadlock detection',
      owner: new mongoose.Types.ObjectId(student.userId),
      indexedChunkCount: 3,
    });

    // Populate vector chunk
    await vectorService.upsertPoints(MATERIALS_COLLECTION, [
      {
        id: 'chunk-os-sync',
        vector: new Array(768).fill(0.01),
        payload: {
          courseId: course.id,
          materialId: 'mat-os-1',
          text: 'Semaphores are synchronization primitives that maintain an integer value with atomic wait and signal operations.',
          originalFilename: 'sync_primitives.pdf',
          heading: 'Semaphores and Mutexes',
          sourceType: 'pdf',
        },
      },
    ]);

    // Provide mock structured question output from AI
    aiProvider.setCustomResponse(
      JSON.stringify([
        {
          id: 'q-sync-1',
          topic: 'Synchronization Primitives',
          learningObjective: 'Understand atomic semaphore operations',
          difficulty: 'intermediate',
          type: 'multiple_choice',
          prompt: 'What primitive uses atomic wait() and signal() operations?',
          options: ['Semaphore', 'File descriptor', 'Virtual memory TLB', 'Device driver'],
          correctAnswer: 0,
          explanation: 'Semaphores manage access to shared resources using atomic counter operations.',
          points: 10,
          sourceChunkIds: ['chunk-os-sync'],
        },
      ])
    );

    const genRes = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${course.id}/assessments/generate`,
      headers: { cookie: `session_token=${student.sessionToken}` },
      payload: {
        mode: 'quiz',
        questionCount: 1,
        difficulty: 'intermediate',
      },
    });

    expect(genRes.statusCode).toBe(201);
    const genBody = JSON.parse(genRes.payload) as ApiResponse<Assessment>;
    expect(genBody.success).toBe(true);

    const clientQuestions = genBody.data.clientQuestions || [];
    expect(clientQuestions).toHaveLength(1);

    const clientQ = clientQuestions[0] as Record<string, unknown>;
    // SECURITY CONTRACT: Ensure correct answer and explanation are NOT leaked in client payload!
    expect(clientQ.correctAnswer).toBeUndefined();
    expect(clientQ.explanation).toBeUndefined();
    expect(clientQ.options).toBeDefined();
    expect(clientQ.prompt).toContain('wait() and signal()');
  });

  it('grades objective question formats deterministically: multiple_choice, multiple_select, true_false', async () => {
    const student = await registerAndLoginUser('grader_user@omnitutor.ai', 'Grader User');
    const course = await CourseModel.create({
      title: 'Data Structures Testing',
      subject: 'Computer Science',
      description: 'Binary search trees, hash tables and heaps',
      owner: new mongoose.Types.ObjectId(student.userId),
    });

    // Create assessment directly in DB with known objective answers
    const assessment = await AssessmentModel.create({
      courseId: course._id,
      userId: new mongoose.Types.ObjectId(student.userId),
      title: 'Objective Data Structures Quiz',
      mode: 'quiz',
      difficulty: 'intermediate',
      version: 1,
      questionCount: 3,
      passingScorePercentage: 70,
      timeLimitMinutes: 15,
      questions: [
        {
          id: 'q-mc',
          topic: 'Binary Search Trees',
          learningObjective: 'Analyze search complexity',
          difficulty: 'intermediate',
          type: 'multiple_choice',
          prompt: 'What is the average time complexity of BST search?',
          options: ['O(log N)', 'O(N^2)', 'O(1)', 'O(N log N)'],
          correctAnswer: 0,
          explanation: 'Balanced BST search takes logarithmic time.',
          points: 10,
          sourceChunkIds: ['chunk-bst'],
        },
        {
          id: 'q-ms',
          topic: 'Hashing',
          learningObjective: 'Identify collision resolution techniques',
          difficulty: 'intermediate',
          type: 'multiple_select',
          prompt: 'Which of the following are valid collision resolution strategies?',
          options: ['Chaining', 'Linear Probing', 'Double Hashing', 'Bubble Sorting'],
          correctAnswer: [0, 1, 2],
          explanation: 'Chaining, linear probing, and double hashing resolve hash collisions.',
          points: 10,
          sourceChunkIds: ['chunk-hash'],
        },
        {
          id: 'q-tf',
          topic: 'Heaps',
          learningObjective: 'Evaluate min-heap invariant',
          difficulty: 'intermediate',
          type: 'true_false',
          prompt: 'In a min-heap, the root node contains the smallest element.',
          correctAnswer: true,
          explanation: 'Min-heap property requires parent to be <= children.',
          points: 10,
          sourceChunkIds: ['chunk-heap'],
        },
      ],
    });

    // Submit attempt with 2 correct answers (MC & TF) and 1 incorrect answer (MS)
    const submitRes = await app.inject({
      method: 'POST',
      url: `/api/v1/assessments/${assessment.id}/submit`,
      headers: { cookie: `session_token=${student.sessionToken}` },
      payload: {
        responses: [
          { questionId: 'q-mc', userAnswer: 0, hintsUsed: 0 },
          { questionId: 'q-ms', userAnswer: [0, 3], hintsUsed: 0 }, // Wrong combination
          { questionId: 'q-tf', userAnswer: 'true', hintsUsed: 0 },
        ],
      },
    });

    expect(submitRes.statusCode).toBe(200);
    const submitBody = JSON.parse(submitRes.payload) as ApiResponse<AssessmentAttempt>;
    expect(submitBody.success).toBe(true);

    const attempt = submitBody.data;
    expect(attempt.totalScore).toBe(20);
    expect(attempt.maxScore).toBe(30);
    expect(attempt.percentage).toBe(67);
    expect(attempt.passed).toBe(false); // 67% < 70% threshold

    // Verify individual response scoring
    const mcResp = attempt.responses.find((r) => r.questionId === 'q-mc');
    expect(mcResp?.isCorrect).toBe(true);
    expect(mcResp?.score).toBe(10);

    const msResp = attempt.responses.find((r) => r.questionId === 'q-ms');
    expect(msResp?.isCorrect).toBe(false);
    expect(msResp?.score).toBe(0);

    const tfResp = attempt.responses.find((r) => r.questionId === 'q-tf');
    expect(tfResp?.isCorrect).toBe(true);
    expect(tfResp?.score).toBe(10);
  });

  it('evaluates short-answer questions using AI rubric grading and uncertainty handling', async () => {
    const student = await registerAndLoginUser('rubric_student@omnitutor.ai', 'Rubric Student');
    const course = await CourseModel.create({
      title: 'Distributed Consensus',
      subject: 'Computer Science',
      description: 'Paxos, Raft and Byzantine fault tolerance',
      owner: new mongoose.Types.ObjectId(student.userId),
    });

    const assessment = await AssessmentModel.create({
      courseId: course._id,
      userId: new mongoose.Types.ObjectId(student.userId),
      title: 'Raft Short Answer Exam',
      mode: 'chapter_assessment',
      difficulty: 'advanced',
      version: 1,
      questionCount: 1,
      passingScorePercentage: 70,
      timeLimitMinutes: 10,
      questions: [
        {
          id: 'q-sa-raft',
          topic: 'Leader Election',
          learningObjective: 'Explain randomized election timeouts',
          difficulty: 'advanced',
          type: 'short_answer',
          prompt: 'Explain why Raft uses randomized election timeouts.',
          correctAnswer: 'Randomized election timeouts split the votes and prevent split-brain elections.',
          explanation: 'Randomization ensures servers rarely start elections simultaneously, avoiding split votes.',
          points: 10,
          rubric: [
            { criterion: 'Split vote prevention', points: 5, description: 'Notes that simultaneous candidate requests are avoided' },
            { criterion: 'Leader emergence', points: 5, description: 'Explains that one node times out first and collects majority votes' },
          ],
          sourceChunkIds: ['chunk-raft-timeouts'],
        },
      ],
    });

    // Mock AI rubric grading response
    aiProvider.setCustomResponse(
      JSON.stringify({
        score: 9,
        isCorrect: true,
        feedback: 'Excellent explanation. Accurately identifies split vote avoidance and majority quorum resolution.',
      })
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/assessments/${assessment.id}/submit`,
      headers: { cookie: `session_token=${student.sessionToken}` },
      payload: {
        responses: [
          {
            questionId: 'q-sa-raft',
            userAnswer: 'Raft randomizes timeouts so multiple nodes do not trigger elections at the same time, preventing split votes.',
            hintsUsed: 0,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as ApiResponse<AssessmentAttempt>;
    expect(body.success).toBe(true);
    expect(body.data.totalScore).toBe(9);
    expect(body.data.responses[0]!.isCorrect).toBe(true);
    expect(body.data.responses[0]!.feedback).toContain('Accurately identifies split vote avoidance');
  });

  it('updates dynamic adaptive topic mastery: raises difficulty on high scores, lowers and flags for revision on low scores', async () => {
    const student = await registerAndLoginUser('adaptive_user@omnitutor.ai', 'Adaptive User');
    const course = await CourseModel.create({
      title: 'Computer Architecture',
      subject: 'Computer Engineering',
      description: 'Pipelining, hazard detection, branch prediction and memory hierarchy',
      owner: new mongoose.Types.ObjectId(student.userId),
    });

    // 1. Initial mastery state (50% default intermediate)
    const topic = 'Pipelining Hazards';
    await TopicMasteryModel.create({
      courseId: course._id,
      userId: new mongoose.Types.ObjectId(student.userId),
      topic,
      masteryScore: 50,
      currentDifficulty: 'intermediate',
      streakCount: 1,
      attemptCount: 1,
      correctCount: 1,
      recommendedRevision: false,
    });

    // 2. High performance attempt: student scores 100% on Pipelining Hazards
    const assessmentHigh = await AssessmentModel.create({
      courseId: course._id,
      userId: new mongoose.Types.ObjectId(student.userId),
      title: 'Pipelining High Test',
      mode: 'quiz',
      difficulty: 'intermediate',
      version: 1,
      questionCount: 1,
      passingScorePercentage: 70,
      timeLimitMinutes: 10,
      questions: [
        {
          id: 'q-pipe-1',
          topic,
          learningObjective: 'Resolve data hazards with forwarding',
          difficulty: 'intermediate',
          type: 'true_false',
          prompt: 'Operand forwarding routes ALU results directly to subsequent instructions.',
          correctAnswer: true,
          explanation: 'Forwarding avoids stalling on RAW hazards.',
          points: 10,
          sourceChunkIds: ['chunk-pipe'],
        },
      ],
    });

    const submitHighRes = await app.inject({
      method: 'POST',
      url: `/api/v1/assessments/${assessmentHigh.id}/submit`,
      headers: { cookie: `session_token=${student.sessionToken}` },
      payload: {
        responses: [{ questionId: 'q-pipe-1', userAnswer: 'true' }],
      },
    });

    expect(submitHighRes.statusCode).toBe(200);
    const highBody = JSON.parse(submitHighRes.payload) as ApiResponse<AssessmentAttempt>;
    expect(highBody.data.topicOutcomes[topic]?.masteryChange).toBe(12);
    expect(highBody.data.topicOutcomes[topic]?.newMastery).toBe(62); // 50 + 12

    // Check DB: streak updated, upgraded difficulty to advanced
    const updatedMasteryDoc1 = await TopicMasteryModel.findOne({ courseId: course._id, topic });
    expect(updatedMasteryDoc1?.streakCount).toBe(2);
    expect(updatedMasteryDoc1?.currentDifficulty).toBe('advanced');

    // 3. Low performance attempt: student scores 0% on Pipelining Hazards
    const assessmentLow = await AssessmentModel.create({
      courseId: course._id,
      userId: new mongoose.Types.ObjectId(student.userId),
      title: 'Pipelining Hard Test',
      mode: 'quiz',
      difficulty: 'advanced',
      version: 1,
      questionCount: 1,
      passingScorePercentage: 70,
      timeLimitMinutes: 10,
      questions: [
        {
          id: 'q-pipe-2',
          topic,
          learningObjective: 'Branch prediction misprediction penalty',
          difficulty: 'advanced',
          type: 'true_false',
          prompt: 'Branch penalty is 0 cycles in a standard 5-stage pipeline without branch prediction.',
          correctAnswer: false,
          explanation: 'Branch penalty requires flushing instructions.',
          points: 10,
          sourceChunkIds: ['chunk-pipe'],
        },
      ],
    });

    const submitLowRes = await app.inject({
      method: 'POST',
      url: `/api/v1/assessments/${assessmentLow.id}/submit`,
      headers: { cookie: `session_token=${student.sessionToken}` },
      payload: {
        responses: [{ questionId: 'q-pipe-2', userAnswer: 'true' }], // Wrong!
      },
    });

    expect(submitLowRes.statusCode).toBe(200);
    const lowBody = JSON.parse(submitLowRes.payload) as ApiResponse<AssessmentAttempt>;
    expect(lowBody.data.topicOutcomes[topic]?.masteryChange).toBe(-12);

    // Check DB: streak reset to 0, difficulty reduced, and recommendedRevision marked true
    const updatedMasteryDoc2 = await TopicMasteryModel.findOne({ courseId: course._id, topic });
    expect(updatedMasteryDoc2?.masteryScore).toBe(50); // 62 - 12
    expect(updatedMasteryDoc2?.streakCount).toBe(0);
    expect(updatedMasteryDoc2?.recommendedRevision).toBe(true);
    expect(updatedMasteryDoc2?.revisionReason).toContain('Re-reading recommended');
    expect(updatedMasteryDoc2?.currentDifficulty).toBe('intermediate'); // Downgraded from advanced
  });

  it('validates attempt ownership and rejects access to unauthorized student', async () => {
    const student1 = await registerAndLoginUser('owner_student@omnitutor.ai', 'Owner Student');
    const student2 = await registerAndLoginUser('unauthorized_student@omnitutor.ai', 'Other Student');

    const course = await CourseModel.create({
      title: 'Discrete Mathematics',
      subject: 'Mathematics',
      description: 'Combinatorics, probability and graph theory principles',
      owner: new mongoose.Types.ObjectId(student1.userId),
    });

    const assessment = await AssessmentModel.create({
      courseId: course._id,
      userId: new mongoose.Types.ObjectId(student1.userId),
      title: 'Permutations & Combinations',
      mode: 'quiz',
      difficulty: 'intermediate',
      version: 1,
      questionCount: 1,
      passingScorePercentage: 70,
      timeLimitMinutes: 10,
      questions: [
        {
          id: 'q-comb-1',
          topic: 'Combinatorics',
          learningObjective: 'Calculate combinations',
          difficulty: 'intermediate',
          type: 'true_false',
          prompt: 'n Choose k is equal to n! / (k!(n-k)!).',
          correctAnswer: true,
          explanation: 'Combinations formula.',
          points: 10,
          sourceChunkIds: ['chunk-comb'],
        },
      ],
    });

    // Student 2 attempts to submit assessment for student 1's course
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/assessments/${assessment.id}/submit`,
      headers: { cookie: `session_token=${student2.sessionToken}` },
      payload: {
        responses: [{ questionId: 'q-comb-1', userAnswer: 'true' }],
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });
});
