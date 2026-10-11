import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import {
  User,
  Session,
  CourseModel,
  ConversationModel,
  MessageModel,
  ConceptNoteModel,
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
import { TutorService } from '../src/modules/tutor/tutor.service.js';
import { MATERIALS_COLLECTION } from '../src/modules/ingestion/ingestion.worker.js';
import type {
  ApiResponse,
  Conversation,
  ConversationMessage,
  ConceptNote,
} from '@omnitutor/shared';

describe('Module 7: AI Tutor, Chat History & Personalized Explanations Tests', () => {
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

  beforeAll(async () => {
    await connectDatabase('mongodb://localhost:27017/omnitutor_test_tutor');

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
      tutorService,
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
      await ConversationModel.deleteMany({});
      await MessageModel.deleteMany({});
      await ConceptNoteModel.deleteMany({});
      await disconnectDatabase();
    }
    await app.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await CourseModel.deleteMany({});
    await ConversationModel.deleteMany({});
    await MessageModel.deleteMany({});
    await ConceptNoteModel.deleteMany({});
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

  it('creates and lists conversations with pedagogical mode configurations', async () => {
    const student = await registerAndLoginUser('alice@omnitutor.ai', 'Alice Tutor');
    const course = await CourseModel.create({
      title: 'Operating Systems',
      subject: 'Computer Science',
      description: 'Concurrency, memory virtual memory and file systems',
      owner: new mongoose.Types.ObjectId(student.userId),
    });

    // Create Socratic tutoring conversation
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${course.id}/conversations`,
      headers: { cookie: `session_token=${student.sessionToken}` },
      payload: {
        title: 'Virtual Memory Paging Session',
        mode: 'socratic',
        academicLevel: 'intermediate',
        explanationStyle: 'analogy',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload) as ApiResponse<Conversation>;
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Virtual Memory Paging Session');
    expect(body.data.mode).toBe('socratic');
    expect(body.data.explanationStyle).toBe('analogy');

    // List conversations
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/${course.id}/conversations`,
      headers: { cookie: `session_token=${student.sessionToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.payload);
    expect(listBody.data.items).toHaveLength(1);
    expect(listBody.data.total).toBe(1);
  });

  it('enforces conversation ownership and rejects cross-user access with 403', async () => {
    const alice = await registerAndLoginUser('alice_own@omnitutor.ai', 'Alice Own');
    const bob = await registerAndLoginUser('bob_attacker@omnitutor.ai', 'Bob Attacker');

    const courseAlice = await CourseModel.create({
      title: 'Compiler Design',
      subject: 'Computer Science',
      description: 'Lexical analysis, parsing, semantic checking and code gen',
      owner: new mongoose.Types.ObjectId(alice.userId),
    });

    const conv = await ConversationModel.create({
      courseId: courseAlice._id,
      userId: new mongoose.Types.ObjectId(alice.userId),
      title: 'LR Parsing Discussion',
      mode: 'direct',
      academicLevel: 'advanced',
      explanationStyle: 'step_by_step',
    });

    // Bob attempts to fetch Alice's conversation messages
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/conversations/${conv.id}/messages`,
      headers: { cookie: `session_token=${bob.sessionToken}` },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('sends student message, retrieves grounded evidence, and persists assistant response with citations', async () => {
    const student = await registerAndLoginUser('learner@omnitutor.ai', 'Fast Learner');
    const course = await CourseModel.create({
      title: 'Machine Learning',
      subject: 'Artificial Intelligence',
      description: 'Supervised, unsupervised and reinforcement learning algorithms',
      owner: new mongoose.Types.ObjectId(student.userId),
    });

    // Populate course vector chunk
    await vectorService.upsertPoints(MATERIALS_COLLECTION, [
      {
        id: 'chunk-ml-dropout',
        vector: new Array(768).fill(0.01),
        payload: {
          courseId: course.id,
          materialId: 'mat-ml-1',
          text: 'Dropout randomly deactivates neurons during training to prevent co-adaptation and overfitting.',
          originalFilename: 'deep_learning_handout.pdf',
          page: 42,
          sourceType: 'pdf',
        },
      },
    ]);

    aiProvider.setCustomResponse(
      'Dropout is an effective regularization technique. As noted in [cite:1], neurons are randomly omitted during training to reduce overfitting.'
    );

    const conv = await ConversationModel.create({
      courseId: course._id,
      userId: new mongoose.Types.ObjectId(student.userId),
      title: 'Deep Learning Regularization',
      mode: 'socratic',
      academicLevel: 'intermediate',
      explanationStyle: 'step_by_step',
    });

    const sendRes = await app.inject({
      method: 'POST',
      url: `/api/v1/conversations/${conv.id}/messages`,
      headers: { cookie: `session_token=${student.sessionToken}` },
      payload: {
        content: 'Why does dropout prevent overfitting in neural networks?',
        academicLevel: 'intermediate',
        explanationStyle: 'step_by_step',
      },
    });

    expect(sendRes.statusCode).toBe(201);
    const sendBody = JSON.parse(sendRes.payload) as ApiResponse<ConversationMessage>;
    expect(sendBody.success).toBe(true);
    expect(sendBody.data.role).toBe('assistant');
    expect(sendBody.data.content).toContain('Dropout is an effective regularization technique');
    expect(sendBody.data.citations).toHaveLength(1);
    expect(sendBody.data.citations[0]!.originalFilename).toBe('deep_learning_handout.pdf');

    // Verify messages persistence in DB (both user and assistant stored)
    const messagesInDb = await MessageModel.find({ conversationId: conv._id }).sort({ createdAt: 1 });
    expect(messagesInDb).toHaveLength(2);
    expect(messagesInDb[0]!.role).toBe('user');
    expect(messagesInDb[1]!.role).toBe('assistant');
  });

  it('supports Socratic progressive hint request before revealing full solution', async () => {
    const student = await registerAndLoginUser('socratic_fan@omnitutor.ai', 'Socratic Student');
    const course = await CourseModel.create({
      title: 'Algorithms & Data Structures',
      subject: 'Computer Science',
      description: 'Graph algorithms, dynamic programming and asymptotic analysis',
      owner: new mongoose.Types.ObjectId(student.userId),
    });

    await vectorService.upsertPoints(MATERIALS_COLLECTION, [
      {
        id: 'chunk-algo-dp',
        vector: new Array(768).fill(0.01),
        payload: {
          courseId: course.id,
          materialId: 'mat-algo-1',
          text: 'The 0/1 Knapsack problem satisfies optimal substructure: dp[i][w] = max(dp[i-1][w], val + dp[i-1][w - wt]).',
          originalFilename: 'knapsack_notes.pdf',
          page: 18,
          sourceType: 'pdf',
        },
      },
    ]);

    aiProvider.setCustomResponse(
      'Think about whether you include or exclude the current item. Consider what smaller subproblem remains in each case. [cite:1]'
    );

    const conv = await ConversationModel.create({
      courseId: course._id,
      userId: new mongoose.Types.ObjectId(student.userId),
      title: 'Knapsack DP Help',
      mode: 'socratic',
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/conversations/${conv.id}/messages`,
      headers: { cookie: `session_token=${student.sessionToken}` },
      payload: {
        content: 'I am stuck on knapsack. Can you give me a hint?',
        requestHint: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload) as ApiResponse<ConversationMessage>;
    expect(body.data.role).toBe('assistant');
    expect(body.data.metadata?.isHint).toBe(true);
    expect(body.data.content).toContain('Think about whether you include or exclude');
  });

  it('regenerates assistant response with updated pedagogical style', async () => {
    const student = await registerAndLoginUser('regen_user@omnitutor.ai', 'Regen User');
    const course = await CourseModel.create({
      title: 'Computer Networks',
      subject: 'Computer Science',
      description: 'TCP/IP protocol suite, routing protocols and congestion control',
      owner: new mongoose.Types.ObjectId(student.userId),
    });

    await vectorService.upsertPoints(MATERIALS_COLLECTION, [
      {
        id: 'chunk-net-tcp',
        vector: new Array(768).fill(0.01),
        payload: {
          courseId: course.id,
          materialId: 'mat-net-1',
          text: 'TCP handshake uses SYN, SYN-ACK, and ACK packets to establish a reliable stream.',
          originalFilename: 'tcp_guide.pdf',
          page: 8,
          sourceType: 'pdf',
        },
      },
    ]);

    const conv = await ConversationModel.create({
      courseId: course._id,
      userId: new mongoose.Types.ObjectId(student.userId),
      title: 'TCP Handshake Discussion',
    });

    // Seed conversation with user message and initial assistant response
    await MessageModel.create({
      conversationId: conv._id,
      courseId: course._id,
      userId: new mongoose.Types.ObjectId(student.userId),
      role: 'user',
      content: 'How does the three-way handshake work?',
      citations: [],
    });

    const assistantMsg = await MessageModel.create({
      conversationId: conv._id,
      courseId: course._id,
      userId: new mongoose.Types.ObjectId(student.userId),
      role: 'assistant',
      content: 'Initial brief explanation [cite:1]',
      citations: [],
    });

    // Provide detailed analogy response for regeneration
    aiProvider.setCustomResponse(
      'Think of the 3-way handshake like a polite phone call: "Hello can you hear me?" -> "Yes, I hear you, can you hear me?" -> "Yes, I hear you loud and clear!" [cite:1]'
    );

    const regenRes = await app.inject({
      method: 'POST',
      url: `/api/v1/conversations/${conv.id}/messages/${assistantMsg.id}/regenerate`,
      headers: { cookie: `session_token=${student.sessionToken}` },
      payload: {
        academicLevel: 'beginner',
        explanationStyle: 'analogy',
      },
    });

    expect(regenRes.statusCode).toBe(200);
    const regenBody = JSON.parse(regenRes.payload) as ApiResponse<ConversationMessage>;
    expect(regenBody.data.content).toContain('polite phone call');
    expect(regenBody.data.metadata?.explanationStyle).toBe('analogy');
  });

  it('manages concept notes: create, list, and delete saved explanations', async () => {
    const student = await registerAndLoginUser('notes_user@omnitutor.ai', 'Notes Scholar');
    const course = await CourseModel.create({
      title: 'Software Architecture',
      subject: 'Software Engineering',
      description: 'Microservices, event-driven architectures and distributed design patterns',
      owner: new mongoose.Types.ObjectId(student.userId),
    });

    // Create concept note
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${course.id}/notes`,
      headers: { cookie: `session_token=${student.sessionToken}` },
      payload: {
        title: 'CAP Theorem Tradeoffs',
        content: 'In the presence of a network partition (P), a distributed data store must choose between Consistency (C) and Availability (A).',
        tags: ['distributed_systems', 'architecture'],
      },
    });

    expect(createRes.statusCode).toBe(201);
    const createdBody = JSON.parse(createRes.payload) as ApiResponse<ConceptNote>;
    expect(createdBody.success).toBe(true);
    expect(createdBody.data.title).toBe('CAP Theorem Tradeoffs');
    const noteId = createdBody.data.id;

    // List concept notes
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/${course.id}/notes`,
      headers: { cookie: `session_token=${student.sessionToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.payload);
    expect(listBody.data).toHaveLength(1);
    expect(listBody.data[0].id).toBe(noteId);

    // Delete concept note
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/notes/${noteId}`,
      headers: { cookie: `session_token=${student.sessionToken}` },
    });
    expect(deleteRes.statusCode).toBe(200);

    const remainingNotes = await ConceptNoteModel.countDocuments({ courseId: course._id });
    expect(remainingNotes).toBe(0);
  });

  it('updates and deletes conversations cleanly with all cascaded messages', async () => {
    const student = await registerAndLoginUser('clean_user@omnitutor.ai', 'Clean User');
    const course = await CourseModel.create({
      title: 'Database Management',
      subject: 'Computer Science',
      description: 'ACID transactions, isolation levels and relational schema design',
      owner: new mongoose.Types.ObjectId(student.userId),
    });

    const conv = await ConversationModel.create({
      courseId: course._id,
      userId: new mongoose.Types.ObjectId(student.userId),
      title: 'ACID Properties Initial',
      isPinned: false,
    });

    await MessageModel.create({
      conversationId: conv._id,
      courseId: course._id,
      userId: new mongoose.Types.ObjectId(student.userId),
      role: 'user',
      content: 'Explain Isolation vs Durability',
      citations: [],
    });

    // Rename and pin conversation
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/conversations/${conv.id}`,
      headers: { cookie: `session_token=${student.sessionToken}` },
      payload: {
        title: 'ACID Properties Deep Dive',
        isPinned: true,
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updateBody = JSON.parse(updateRes.payload) as ApiResponse<Conversation>;
    expect(updateBody.data.title).toBe('ACID Properties Deep Dive');
    expect(updateBody.data.isPinned).toBe(true);

    // Delete conversation
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/conversations/${conv.id}`,
      headers: { cookie: `session_token=${student.sessionToken}` },
    });
    expect(delRes.statusCode).toBe(200);

    const convCount = await ConversationModel.countDocuments({ _id: conv._id });
    const msgCount = await MessageModel.countDocuments({ conversationId: conv._id });
    expect(convCount).toBe(0);
    expect(msgCount).toBe(0);
  });
});
