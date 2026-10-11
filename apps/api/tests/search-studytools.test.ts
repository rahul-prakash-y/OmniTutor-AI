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
  ConceptNoteModel,
  RecentMaterialModel,
  ConversationModel,
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
import { SearchService } from '../src/modules/search/search.service.js';
import { MaterialViewerService } from '../src/modules/material-viewer/material-viewer.service.js';
import { StudyToolsService } from '../src/modules/study-tools/study-tools.service.js';
import { MATERIALS_COLLECTION } from '../src/modules/ingestion/ingestion.worker.js';
import type {
  ApiResponse,
  GlobalSearchResponse,
  MaterialContentDetails,
  RecentMaterial,
  StudyToolNote,
  GroundedSummaryResponse,
  GroundedFlashcardsResponse,
} from '@omnitutor/shared';

describe('Module 10: Global Search, Material Viewer & Study Tools Tests', () => {
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
  let searchService: SearchService;
  let materialViewerService: MaterialViewerService;
  let studyToolsService: StudyToolsService;

  beforeAll(async () => {
    await connectDatabase('mongodb://localhost:27017/omnitutor_test_search_studytools');

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

    ragService = new RagService({
      vectorService,
      embeddingProvider,
      aiProvider,
    });

    searchService = new SearchService(vectorService, embeddingProvider);
    materialViewerService = new MaterialViewerService();
    studyToolsService = new StudyToolsService(ragService, aiProvider);

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
      ragService,
      searchService,
      materialViewerService,
      studyToolsService,
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
    await ConceptNoteModel.deleteMany({});
    await RecentMaterialModel.deleteMany({});
    await ConversationModel.deleteMany({});
    await vectorService.deletePointsByFilter(MATERIALS_COLLECTION, {});
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

  it('enforces strict course permission filtering during global search and prevents cross-user leakage', async () => {
    const student1 = await registerAndLoginUser('student1@omnitutor.ai', 'Student One');
    const student2 = await registerAndLoginUser('student2@omnitutor.ai', 'Student Two');

    // Course owned by Student 1
    const course1 = await CourseModel.create({
      title: 'Quantum Computing Fundamentals',
      description: 'Superposition, entanglement, and quantum circuit algorithms.',
      subject: 'physics',
      academicLevel: 'undergraduate',
      owner: student1.user._id,
      status: 'active',
      tags: ['quantum', 'qubits'],
    });

    // Course owned by Student 2
    await CourseModel.create({
      title: 'Quantum Cryptography & Key Distribution',
      description: 'BB84 protocol, eavesdropping detection, and photon entanglement.',
      subject: 'physics',
      academicLevel: 'graduate',
      owner: student2.user._id,
      status: 'active',
      tags: ['quantum', 'cryptography'],
    });

    // Student 1 searches for "Quantum"
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search?q=Quantum',
      headers: {
        cookie: `session_token=${student1.sessionToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body: ApiResponse<GlobalSearchResponse> = res.json();
    expect(body.success).toBe(true);

    // Student 1 should only see course1, never course2
    const courseResults = body.data.results.filter((r) => r.category === 'course');
    expect(courseResults.length).toBe(1);
    expect(courseResults[0]?.id).toBe(course1._id.toString());
    expect(courseResults[0]?.title).toBe('Quantum Computing Fundamentals');
  });

  it('safely handles empty queries, whitespace, and sanitizes regex metacharacters in search queries', async () => {
    const { sessionToken } = await registerAndLoginUser('regex@omnitutor.ai', 'Regex Student');

    // Query with regex metacharacters (*, +, ?, ^, $, [], {})
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/search?q=' + encodeURIComponent('C++ [Standard] .* $ ^ ()'),
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.results).toEqual([]);
  });

  it('provides authenticated material viewer content with slide/page coordinates and blocks unauthorized students', async () => {
    const student1 = await registerAndLoginUser('owner@omnitutor.ai', 'Owner Student');
    const student2 = await registerAndLoginUser('intruder@omnitutor.ai', 'Intruder Student');

    const course = await CourseModel.create({
      title: 'Operating Systems & Concurrency',
      description: 'Semaphores, virtual memory paging, and scheduler design.',
      subject: 'computer_science',
      academicLevel: 'undergraduate',
      owner: student1.user._id,
      status: 'active',
      tags: ['os'],
    });

    const material = await MaterialModel.create({
      courseId: course._id,
      ownerId: student1.user._id,
      filename: 'virtual_memory.pdf',
      originalName: 'Virtual Memory Paging Systems.pdf',
      mimeType: 'application/pdf',
      detectedMimeType: 'application/pdf',
      sizeBytes: 20480,
      storageKey: 'storage/vm.pdf',
      sourceType: 'pdf',
      status: 'indexed',
      chunkCount: 10,
      retryCount: 0,
      metadata: { pageCount: 8 },
    });

    // 1. Student 1 (owner) accesses viewer content -> 200 OK
    const ownerRes = await app.inject({
      method: 'GET',
      url: `/api/v1/materials/${material._id.toString()}/viewer-content`,
      headers: {
        cookie: `session_token=${student1.sessionToken}`,
      },
    });

    expect(ownerRes.statusCode).toBe(200);
    const ownerBody: ApiResponse<MaterialContentDetails> = ownerRes.json();
    expect(ownerBody.data.title).toBe('Virtual Memory Paging Systems.pdf');
    expect(ownerBody.data.totalPages).toBe(8);
    expect(ownerBody.data.pages?.length).toBe(8);

    // 2. Student 2 (unauthorized) tries to access viewer content -> 403 Forbidden
    const intruderRes = await app.inject({
      method: 'GET',
      url: `/api/v1/materials/${material._id.toString()}/viewer-content`,
      headers: {
        cookie: `session_token=${student2.sessionToken}`,
      },
    });

    expect(intruderRes.statusCode).toBe(403);
  });

  it('records recent material viewing position and retrieves sorted recent history', async () => {
    const { user, sessionToken } = await registerAndLoginUser('recent@omnitutor.ai', 'Recent Student');

    const course = await CourseModel.create({
      title: 'Compiler Design',
      description: 'Lexing, parsing, AST generation, and LLVM intermediate representation.',
      subject: 'computer_science',
      academicLevel: 'advanced',
      owner: user._id,
      status: 'active',
      tags: ['compilers'],
    });

    const material = await MaterialModel.create({
      courseId: course._id,
      ownerId: user._id,
      filename: 'parsing.pdf',
      originalName: 'LR Parsing Tables.pdf',
      mimeType: 'application/pdf',
      detectedMimeType: 'application/pdf',
      sizeBytes: 30000,
      storageKey: 'storage/parsing.pdf',
      sourceType: 'pdf',
      status: 'indexed',
      chunkCount: 12,
      retryCount: 0,
    });

    // Record position at page 5
    const recRes = await app.inject({
      method: 'POST',
      url: `/api/v1/materials/${material._id.toString()}/recent`,
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
      payload: {
        lastPosition: { page: 5 },
      },
    });

    expect(recRes.statusCode).toBe(200);
    const recBody: ApiResponse<RecentMaterial> = recRes.json();
    expect(recBody.data.lastPosition?.page).toBe(5);

    // Retrieve recent materials list
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/materials/recent',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
    });

    expect(listRes.statusCode).toBe(200);
    const listBody: ApiResponse<RecentMaterial[]> = listRes.json();
    expect(listBody.data.length).toBe(1);
    expect(listBody.data[0]?.materialTitle).toBe('LR Parsing Tables.pdf');
    expect(listBody.data[0]?.lastPosition?.page).toBe(5);
  });

  it('generates grounded AI summaries with citations and grounded flashcards via RAG engine', async () => {
    const { user, sessionToken } = await registerAndLoginUser('rag_summary@omnitutor.ai', 'RAG Student');

    const course = await CourseModel.create({
      title: 'Neural Networks & Deep Learning',
      description: 'Deep feedforward networks, convolutional architectures, and attention mechanisms.',
      subject: 'computer_science',
      academicLevel: 'graduate',
      owner: user._id,
      status: 'active',
      tags: ['deep-learning'],
    });

    const material = await MaterialModel.create({
      courseId: course._id,
      ownerId: user._id,
      filename: 'attention_paper.pdf',
      originalName: 'Attention Is All You Need.pdf',
      mimeType: 'application/pdf',
      detectedMimeType: 'application/pdf',
      sizeBytes: 40000,
      storageKey: 'storage/attention.pdf',
      sourceType: 'pdf',
      status: 'indexed',
      chunkCount: 2,
      retryCount: 0,
    });

    // Seed Qdrant points with verified provenance
    await vectorService.upsertPoints(MATERIALS_COLLECTION, [
      {
        id: 'chunk-attn-1',
        vector: new Array(768).fill(0.1),
        payload: {
          chunkId: 'chunk-attn-1',
          courseId: course._id.toString(),
          materialId: material._id.toString(),
          originalFilename: material.originalName,
          sourceType: 'pdf',
          page: 3,
          heading: 'Multi-Head Attention',
          content: 'Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.',
        },
      },
    ]);

    // 1. Generate grounded summary
    const sumRes = await app.inject({
      method: 'POST',
      url: '/api/v1/study-tools/summaries/generate',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
      payload: {
        courseId: course._id.toString(),
        topic: 'Multi-Head Attention',
        style: 'concise',
      },
    });

    expect(sumRes.statusCode).toBe(200);
    const sumBody: ApiResponse<GroundedSummaryResponse> = sumRes.json();
    expect(sumBody.success).toBe(true);
    expect(sumBody.data.summary.length).toBeGreaterThan(10);
    expect(sumBody.data.citations.length).toBeGreaterThan(0);
    expect(sumBody.data.citations[0]?.originalFilename).toBe('Attention Is All You Need.pdf');

    // 2. Generate grounded flashcards
    const fcRes = await app.inject({
      method: 'POST',
      url: '/api/v1/study-tools/flashcards/generate',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
      payload: {
        courseId: course._id.toString(),
        topic: 'Multi-Head Attention',
        count: 2,
      },
    });

    expect(fcRes.statusCode).toBe(200);
    const fcBody: ApiResponse<GroundedFlashcardsResponse> = fcRes.json();
    expect(fcBody.success).toBe(true);
    expect(fcBody.data.flashcards.length).toBeGreaterThanOrEqual(1);
    expect(fcBody.data.flashcards[0]?.front).toBeDefined();
    expect(fcBody.data.flashcards[0]?.back).toBeDefined();
    expect(fcBody.data.flashcards[0]?.citations.length).toBeGreaterThan(0);
  });

  it('persists, updates, and deletes study notes with categorization and tags', async () => {
    const { user, sessionToken } = await registerAndLoginUser('notes@omnitutor.ai', 'Notes Student');

    const course = await CourseModel.create({
      title: 'Cloud Architecture & DevOps',
      description: 'Microservices, containers, infrastructure as code, and CI/CD pipelines.',
      subject: 'computer_science',
      academicLevel: 'intermediate',
      owner: user._id,
      status: 'active',
      tags: ['cloud'],
    });

    // 1. Create a note
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/study-tools/notes',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
      payload: {
        courseId: course._id.toString(),
        category: 'revision',
        title: 'Kubernetes Pod Lifecycle Revision',
        content: 'Pods have five phase states: Pending, Running, Succeeded, Failed, and Unknown.',
        tags: ['k8s', 'containers', 'devops'],
      },
    });

    expect(createRes.statusCode).toBe(201);
    const createBody: ApiResponse<StudyToolNote> = createRes.json();
    const noteId = createBody.data.id;
    expect(createBody.data.title).toBe('Kubernetes Pod Lifecycle Revision');

    // 2. List notes by tag
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/study-tools/notes?tag=k8s',
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
    });

    expect(listRes.statusCode).toBe(200);
    const listBody: ApiResponse<StudyToolNote[]> = listRes.json();
    expect(listBody.data.length).toBe(1);

    // 3. Update note
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/study-tools/notes/${noteId}`,
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
      payload: {
        title: 'Kubernetes Pod Lifecycle (Updated)',
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updateBody: ApiResponse<StudyToolNote> = updateRes.json();
    expect(updateBody.data.title).toBe('Kubernetes Pod Lifecycle (Updated)');

    // 4. Delete note
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/study-tools/notes/${noteId}`,
      headers: {
        cookie: `session_token=${sessionToken}`,
      },
    });

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.json().data.deleted).toBe(true);

    const count = await ConceptNoteModel.countDocuments({ _id: noteId });
    expect(count).toBe(0);
  });
});
