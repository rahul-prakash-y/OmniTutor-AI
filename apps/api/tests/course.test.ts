import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { User, Session, CourseModel, MaterialModel } from '../src/database/models/index.js';
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
import type { ApiResponse, AuthResponse, Course } from '@omnitutor/shared';

describe('Module 4: Course Management and Access Control Tests', () => {
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

  beforeAll(async () => {
    await connectDatabase('mongodb://localhost:27017/omnitutor_test_courses');

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

    app = createApp({
      aiProvider: new MockAIProvider(),
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
      disableRequestLogging: true,
    });

    await app.ready();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
      await Session.deleteMany({});
      await CourseModel.deleteMany({});
      await MaterialModel.deleteMany({});
      await disconnectDatabase();
    }
    await app.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await CourseModel.deleteMany({});
    await MaterialModel.deleteMany({});
    storageService.clear();
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
      payload: {
        email,
        password: 'Password123!',
        fullName: name,
      },
    });

    const body = JSON.parse(regRes.body) as ApiResponse<AuthResponse>;
    const cookie = extractCookie(regRes.headers);
    const csrfToken = body.data.csrfToken;
    const userId = body.data.user.id;

    return { cookie, csrfToken, userId };
  }

  it('Creates a course with full metadata and sets default statuses', async () => {
    const user = await registerAndLoginUser('student1@example.com', 'Alice Smith');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        cookie: `session_token=${user.cookie}`,
        'x-csrf-token': user.csrfToken,
      },
      payload: {
        title: 'Distributed Systems & Consensus',
        description: 'Deep dive into Raft, Paxos, vector clocks, and Byzantine fault tolerance.',
        subject: 'computer_science',
        academicLevel: 'advanced',
        tags: ['distributed-systems', 'consensus', 'algorithms'],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as ApiResponse<Course>;
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Distributed Systems & Consensus');
    expect(body.data.ownerId).toBe(user.userId);
    expect(body.data.status).toBe('active');
    expect(body.data.processingStatus).toBe('idle');
    expect(body.data.materialCount).toBe(0);
    expect(body.data.isArchived).toBe(false);
  });

  it('Lists and filters courses for the authenticated user only', async () => {
    const alice = await registerAndLoginUser('alice@example.com', 'Alice');
    const bob = await registerAndLoginUser('bob@example.com', 'Bob');

    // Create courses for Alice
    await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        cookie: `session_token=${alice.cookie}`,
        'x-csrf-token': alice.csrfToken,
      },
      payload: {
        title: 'Machine Learning Fundamentals',
        description: 'Supervised and unsupervised learning techniques.',
        subject: 'data_science',
        academicLevel: 'intermediate',
        tags: ['ml', 'python'],
      },
    });

    await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        cookie: `session_token=${alice.cookie}`,
        'x-csrf-token': alice.csrfToken,
      },
      payload: {
        title: 'Quantum Computing Introduction',
        description: 'Qubits, quantum circuits, and Shor algorithm.',
        subject: 'physics',
        academicLevel: 'advanced',
        tags: ['quantum', 'physics'],
      },
    });

    // Create course for Bob
    await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        cookie: `session_token=${bob.cookie}`,
        'x-csrf-token': bob.csrfToken,
      },
      payload: {
        title: 'Bob Private Cryptography Course',
        description: 'Elliptic curve cryptography.',
        subject: 'mathematics',
        academicLevel: 'advanced',
        tags: ['crypto'],
      },
    });

    // Alice fetches her courses
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/courses',
      headers: {
        cookie: `session_token=${alice.cookie}`,
      },
    });

    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.body) as ApiResponse<{ courses: Course[]; total: number }>;
    expect(listBody.data.total).toBe(2);
    expect(listBody.data.courses.some((c) => c.title.includes('Bob'))).toBe(false);
  });

  it('Enforces course ownership and prevents unauthorized access and modification', async () => {
    const owner = await registerAndLoginUser('owner@example.com', 'Course Owner');
    const attacker = await registerAndLoginUser('attacker@example.com', 'Attacker');

    // Owner creates course
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        cookie: `session_token=${owner.cookie}`,
        'x-csrf-token': owner.csrfToken,
      },
      payload: {
        title: 'Proprietary Research Course',
        description: 'Highly confidential syllabus and research materials.',
        subject: 'computer_science',
        academicLevel: 'advanced',
      },
    });
    const courseId = (JSON.parse(createRes.body) as ApiResponse<Course>).data.id;

    // Attacker tries to read owner's course
    const readRes = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/${courseId}`,
      headers: {
        cookie: `session_token=${attacker.cookie}`,
      },
    });
    expect(readRes.statusCode).toBe(403);

    // Attacker tries to update owner's course
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/courses/${courseId}`,
      headers: {
        cookie: `session_token=${attacker.cookie}`,
        'x-csrf-token': attacker.csrfToken,
      },
      payload: {
        title: 'Hacked Course Title',
      },
    });
    expect(updateRes.statusCode).toBe(403);

    // Attacker tries to delete owner's course
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/courses/${courseId}`,
      headers: {
        cookie: `session_token=${attacker.cookie}`,
        'x-csrf-token': attacker.csrfToken,
      },
    });
    expect(deleteRes.statusCode).toBe(403);
  });

  it('Archives and unarchives a course', async () => {
    const user = await registerAndLoginUser('student2@example.com', 'Student 2');

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        cookie: `session_token=${user.cookie}`,
        'x-csrf-token': user.csrfToken,
      },
      payload: {
        title: 'Linear Algebra for Machine Learning',
        description: 'Eigenvalues, SVD, and matrix decompositions.',
        subject: 'mathematics',
        academicLevel: 'intermediate',
      },
    });
    const courseId = (JSON.parse(createRes.body) as ApiResponse<Course>).data.id;

    // Archive course
    const archiveRes = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/archive`,
      headers: {
        cookie: `session_token=${user.cookie}`,
        'x-csrf-token': user.csrfToken,
      },
      payload: {
        isArchived: true,
      },
    });

    expect(archiveRes.statusCode).toBe(200);
    const archiveBody = JSON.parse(archiveRes.body) as ApiResponse<Course>;
    expect(archiveBody.data.isArchived).toBe(true);
    expect(archiveBody.data.status).toBe('archived');

    // Unarchive
    const unarchiveRes = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/archive`,
      headers: {
        cookie: `session_token=${user.cookie}`,
        'x-csrf-token': user.csrfToken,
      },
      payload: {
        isArchived: false,
      },
    });
    expect(unarchiveRes.statusCode).toBe(200);
    expect((JSON.parse(unarchiveRes.body) as ApiResponse<Course>).data.isArchived).toBe(false);
  });
});
