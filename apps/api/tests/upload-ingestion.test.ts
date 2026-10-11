import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import AdmZip from 'adm-zip';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import {
  User,
  Session,
  CourseModel,
  MaterialModel,
  IngestionJobModel,
} from '../src/database/models/index.js';
import { MockEmailService } from '../src/services/email/mock.email.service.js';
import { MockAIProvider } from '../src/services/ai/mock.provider.js';
import { MockVectorService } from '../src/services/vector/mock.vector.service.js';
import { MockStorageService } from '../src/services/storage/mock.storage.service.js';
import { MockEmbeddingProvider } from '../src/services/embedding/mock.embedding.provider.js';
import { IngestionQueueService } from '../src/modules/ingestion/queue.service.js';
import { IngestionWorker, MATERIALS_COLLECTION } from '../src/modules/ingestion/ingestion.worker.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { UserService } from '../src/modules/user/user.service.js';
import { CourseService } from '../src/modules/course/course.service.js';
import { MaterialService } from '../src/modules/material/material.service.js';
import { IngestionService } from '../src/modules/ingestion/ingestion.service.js';
import type { ApiResponse, AuthResponse, Course, IngestionJob, Material } from '@omnitutor/shared';

describe('Module 4 & 5: Secure Uploads, Multimodal Adapters & Ingestion Pipeline', () => {
  let app: FastifyInstance;
  let emailService: MockEmailService;
  let authService: AuthService;
  let userService: UserService;
  let storageService: MockStorageService;
  let vectorService: MockVectorService;
  let embeddingProvider: MockEmbeddingProvider;
  let queueService: IngestionQueueService;
  let worker: IngestionWorker;
  let courseService: CourseService;
  let materialService: MaterialService;
  let ingestionService: IngestionService;

  beforeAll(async () => {
    await connectDatabase('mongodb://localhost:27017/omnitutor_test_ingestion');

    emailService = new MockEmailService('http://localhost:5173');
    authService = new AuthService(emailService);
    userService = new UserService();
    storageService = new MockStorageService();
    vectorService = new MockVectorService();
    embeddingProvider = new MockEmbeddingProvider(768);
    queueService = new IngestionQueueService(2);

    worker = new IngestionWorker({
      storage: storageService,
      embeddings: embeddingProvider,
      vectors: vectorService,
      queue: queueService,
    });

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
      await IngestionJobModel.deleteMany({});
      await disconnectDatabase();
    }
    await app.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await CourseModel.deleteMany({});
    await MaterialModel.deleteMany({});
    await IngestionJobModel.deleteMany({});
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
      payload: { email, password: 'Password123!', fullName: name },
    });
    const body = JSON.parse(regRes.body) as ApiResponse<AuthResponse>;
    return {
      cookie: extractCookie(regRes.headers),
      csrfToken: body.data.csrfToken,
      userId: body.data.user.id,
    };
  }

  async function createTestCourse(user: { cookie: string; csrfToken: string }) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        cookie: `session_token=${user.cookie}`,
        'x-csrf-token': user.csrfToken,
      },
      payload: {
        title: 'Algorithms and Data Structures',
        description: 'Complete algorithm analysis course with dynamic programming.',
        subject: 'computer_science',
        academicLevel: 'undergraduate',
      },
    });
    return (JSON.parse(res.body) as ApiResponse<Course>).data.id;
  }

  // Helpers to generate valid test file buffers with genuine magic bytes
  function createTestTextBuffer(content: string): Buffer {
    return Buffer.from(content, 'utf8');
  }

  function createTestDocxBuffer(title: string, bodyText: string): Buffer {
    const zip = new AdmZip();
    zip.addFile('[Content_Types].xml', Buffer.from('<Types></Types>', 'utf8'));
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:t>${title}</w:t></w:p>
          <w:p><w:t>${bodyText}</w:t></w:p>
        </w:body>
      </w:document>`;
    zip.addFile('word/document.xml', Buffer.from(docXml, 'utf8'));
    return zip.toBuffer();
  }

  function createTestPptxBuffer(slideTitle: string, slideText: string): Buffer {
    const zip = new AdmZip();
    zip.addFile('[Content_Types].xml', Buffer.from('<Types></Types>', 'utf8'));
    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp><p:txBody><a:p><a:r><a:t>${slideTitle}</a:t></a:r></a:p></p:txBody></p:sp>
            <p:sp><p:txBody><a:p><a:r><a:t>${slideText}</a:t></a:r></a:p></p:txBody></p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>`;
    zip.addFile('ppt/slides/slide1.xml', Buffer.from(slideXml, 'utf8'));
    return zip.toBuffer();
  }

  function createTestMp3Buffer(): Buffer {
    // MP3 ID3 header: 'ID3', version 3, flags 0, length 10
    const header = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0a]);
    const audioPayload = Buffer.alloc(1024, 0xaa);
    return Buffer.concat([header, audioPayload]);
  }

  function createTestMp4Buffer(): Buffer {
    // MP4 header: 4 bytes length, 'ftyp', 'isom'
    const boxLength = Buffer.from([0x00, 0x00, 0x00, 0x18]);
    const ftypBox = Buffer.from('ftypisom\x00\x00\x02\x00isomiso2mp41', 'binary');
    const mediaPayload = Buffer.alloc(1024, 0x55);
    return Buffer.concat([boxLength, ftypBox, mediaPayload]);
  }

  it('Validates file upload, enforces magic bytes, and rejects MIME spoofing', async () => {
    const user = await registerAndLoginUser('user1@example.com', 'User 1');
    const courseId = await createTestCourse(user);

    // Spoofed file: named 'lecture.pdf' but contains arbitrary non-PDF binary bytes
    const fakeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00executable_bytes');

    const uploadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/materials/upload`,
      headers: {
        cookie: `session_token=${user.cookie}`,
        'x-csrf-token': user.csrfToken,
      },
      payload: {
        filename: 'lecture.pdf',
        mimeType: 'application/pdf',
        contentBase64: fakeBuffer.toString('base64'),
      },
    });

    expect(uploadRes.statusCode).toBe(400);
    const errBody = JSON.parse(uploadRes.body);
    expect(errBody.error.message).toContain('Unsupported or unrecognized file signature');
  });

  it('Rejects files exceeding configured size limits', async () => {
    const user = await registerAndLoginUser('user2@example.com', 'User 2');
    const courseId = await createTestCourse(user);

    // Text file limit is 5MB. Let's create an oversized buffer of 5.5MB
    const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024, 'A');

    const uploadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/materials/upload`,
      headers: {
        cookie: `session_token=${user.cookie}`,
        'x-csrf-token': user.csrfToken,
      },
      payload: {
        filename: 'huge_document.txt',
        contentBase64: oversizedBuffer.toString('base64'),
      },
    });

    expect([400, 413]).toContain(uploadRes.statusCode);
    const errBody = JSON.parse(uploadRes.body);
    expect(errBody.error.message).toMatch(/exceeds maximum allowed size|Payload Too Large/i);
  });

  it('Enforces ownership and rejects unauthorized uploads to another user course', async () => {
    const owner = await registerAndLoginUser('owner2@example.com', 'Owner 2');
    const hacker = await registerAndLoginUser('hacker2@example.com', 'Hacker 2');
    const courseId = await createTestCourse(owner);

    const validText = createTestTextBuffer('# Notes\nSample text.');

    const uploadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/materials/upload`,
      headers: {
        cookie: `session_token=${hacker.cookie}`,
        'x-csrf-token': hacker.csrfToken,
      },
      payload: {
        filename: 'notes.md',
        contentBase64: validText.toString('base64'),
      },
    });

    expect(uploadRes.statusCode).toBe(403);
  });

  it('Uploads and ingests Markdown notes into traceable chunks and Qdrant points', async () => {
    const user = await registerAndLoginUser('user3@example.com', 'User 3');
    const courseId = await createTestCourse(user);

    const mdContent = `# Dynamic Programming Foundations

Dynamic programming is an algorithmic paradigm that solves complex problems by breaking them into simpler subproblems.

## Optimal Substructure

A problem exhibits optimal substructure if an optimal solution to the problem contains optimal solutions to subproblems.

## Overlapping Subproblems

Unlike divide and conquer, dynamic programming is applicable when subproblems recur multiple times.`;

    const mdBuffer = createTestTextBuffer(mdContent);

    // 1. Upload material
    const uploadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/materials/upload`,
      headers: {
        cookie: `session_token=${user.cookie}`,
        'x-csrf-token': user.csrfToken,
      },
      payload: {
        filename: 'dp_notes.md',
        contentBase64: mdBuffer.toString('base64'),
      },
    });

    expect(uploadRes.statusCode).toBe(202);
    const uploadBody = JSON.parse(uploadRes.body) as ApiResponse<{ material: Material; job: IngestionJob }>;
    const materialId = uploadBody.data.material.id;
    const jobId = uploadBody.data.job.id;

    expect(uploadBody.data.material.status).toBe('queued');
    expect(uploadBody.data.material.sourceType).toBe('md');

    // 2. Process job directly via worker
    await worker.processJob(jobId);

    // 3. Verify material status transitioned to 'indexed'
    const matDoc = await MaterialModel.findById(materialId);
    expect(matDoc?.status).toBe('indexed');
    expect(matDoc?.chunkCount).toBeGreaterThanOrEqual(1);

    // 4. Verify Course metrics updated
    const courseDoc = await CourseModel.findById(courseId);
    expect(courseDoc?.materialCount).toBe(1);
    expect(courseDoc?.indexedChunkCount).toBeGreaterThanOrEqual(1);

    // 5. Verify vectors persisted in Qdrant store
    const points = vectorService.getStoredPoints(MATERIALS_COLLECTION);
    const materialPoints = points.filter((p) => p.payload?.materialId === materialId);
    expect(materialPoints.length).toBeGreaterThanOrEqual(1);
    expect(materialPoints[0]?.payload?.courseId).toBe(courseId);
    expect(materialPoints[0]?.payload?.contentHash).toBeDefined();

    // 6. Test Preview API
    const previewRes = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/${courseId}/materials/${materialId}/preview`,
      headers: {
        cookie: `session_token=${user.cookie}`,
      },
    });
    expect(previewRes.statusCode).toBe(200);
    const previewBody = JSON.parse(previewRes.body);
    expect(previewBody.data.materialTitle).toBe('dp_notes.md');
    expect(previewBody.data.chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('Processes DOCX documents with structured headings and paragraphs', async () => {
    const user = await registerAndLoginUser('user4@example.com', 'User 4');
    const courseId = await createTestCourse(user);

    const docxBuffer = createTestDocxBuffer(
      'Graph Traversal Algorithms',
      'Breadth-first search explores neighboring nodes first using a FIFO queue structure.'
    );

    const uploadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/materials/upload`,
      headers: {
        cookie: `session_token=${user.cookie}`,
        'x-csrf-token': user.csrfToken,
      },
      payload: {
        filename: 'graph_algorithms.docx',
        contentBase64: docxBuffer.toString('base64'),
      },
    });

    expect(uploadRes.statusCode).toBe(202);
    const uploadBody = JSON.parse(uploadRes.body) as ApiResponse<{ material: Material; job: IngestionJob }>;
    const materialId = uploadBody.data.material.id;
    const jobId = uploadBody.data.job.id;

    await worker.processJob(jobId);

    const mat = await MaterialModel.findById(materialId);
    expect(mat?.status).toBe('indexed');
    expect(mat?.sourceType).toBe('docx');
  });

  it('Processes PPTX presentations with slide numbers and slide titles', async () => {
    const user = await registerAndLoginUser('user5@example.com', 'User 5');
    const courseId = await createTestCourse(user);

    const pptxBuffer = createTestPptxBuffer(
      'Slide 1: Memory Models',
      'Virtual memory abstracts physical address spaces using hardware MMUs and page tables.'
    );

    const uploadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/materials/upload`,
      headers: {
        cookie: `session_token=${user.cookie}`,
        'x-csrf-token': user.csrfToken,
      },
      payload: {
        filename: 'lecture_slides.pptx',
        contentBase64: pptxBuffer.toString('base64'),
      },
    });

    expect(uploadRes.statusCode).toBe(202);
    const uploadBody = JSON.parse(uploadRes.body) as ApiResponse<{ material: Material; job: IngestionJob }>;
    const materialId = uploadBody.data.material.id;
    const jobId = uploadBody.data.job.id;

    await worker.processJob(jobId);

    const mat = await MaterialModel.findById(materialId);
    expect(mat?.status).toBe('indexed');
    expect(mat?.sourceType).toBe('pptx');
    expect(mat?.metadata.slideCount).toBe(1);
  });

  it('Processes Audio MP3 uploads and generates timestamped transcription chunks', async () => {
    const user = await registerAndLoginUser('user6@example.com', 'User 6');
    const courseId = await createTestCourse(user);

    const mp3Buffer = createTestMp3Buffer();

    const uploadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/materials/upload`,
      headers: {
        cookie: `session_token=${user.cookie}`,
        'x-csrf-token': user.csrfToken,
      },
      payload: {
        filename: 'podcast_lecture.mp3',
        contentBase64: mp3Buffer.toString('base64'),
      },
    });

    expect(uploadRes.statusCode).toBe(202);
    const uploadBody = JSON.parse(uploadRes.body) as ApiResponse<{ material: Material; job: IngestionJob }>;
    const materialId = uploadBody.data.material.id;
    const jobId = uploadBody.data.job.id;

    await worker.processJob(jobId);

    const mat = await MaterialModel.findById(materialId);
    expect(mat?.status).toBe('indexed');
    expect(mat?.sourceType).toBe('audio');
    expect(mat?.metadata.durationSeconds).toBeGreaterThan(0);
  });

  it('Processes Video MP4 uploads and preserves video metadata', async () => {
    const user = await registerAndLoginUser('user7@example.com', 'User 7');
    const courseId = await createTestCourse(user);

    const mp4Buffer = createTestMp4Buffer();

    const uploadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/materials/upload`,
      headers: {
        cookie: `session_token=${user.cookie}`,
        'x-csrf-token': user.csrfToken,
      },
      payload: {
        filename: 'seminar.mp4',
        contentBase64: mp4Buffer.toString('base64'),
      },
    });

    expect(uploadRes.statusCode).toBe(202);
    const uploadBody = JSON.parse(uploadRes.body) as ApiResponse<{ material: Material; job: IngestionJob }>;
    const materialId = uploadBody.data.material.id;
    const jobId = uploadBody.data.job.id;

    await worker.processJob(jobId);

    const mat = await MaterialModel.findById(materialId);
    expect(mat?.status).toBe('indexed');
    expect(mat?.sourceType).toBe('video');
    expect(mat?.metadata.hasVisuals).toBe(true);
  });

  it('Supports retrying failed materials and manages retry counts', async () => {
    const user = await registerAndLoginUser('user8@example.com', 'User 8');
    const courseId = await createTestCourse(user);

    const textBuffer = createTestTextBuffer('# Notes\nInitial content for retry test.');

    const uploadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/materials/upload`,
      headers: {
        cookie: `session_token=${user.cookie}`,
        'x-csrf-token': user.csrfToken,
      },
      payload: {
        filename: 'retry_notes.txt',
        contentBase64: textBuffer.toString('base64'),
      },
    });

    const body = JSON.parse(uploadRes.body) as ApiResponse<{ material: Material; job: IngestionJob }>;
    const materialId = body.data.material.id;

    // Simulate failed status on material
    await MaterialModel.findByIdAndUpdate(materialId, {
      status: 'failed',
      errorMessage: 'Temporary vector storage timeout',
    });

    // Call retry endpoint
    const retryRes = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/materials/${materialId}/retry`,
      headers: {
        cookie: `session_token=${user.cookie}`,
        'x-csrf-token': user.csrfToken,
      },
    });

    expect(retryRes.statusCode).toBe(202);
    const retryBody = JSON.parse(retryRes.body) as ApiResponse<IngestionJob>;
    expect(retryBody.data.status).toBe('queued');

    const updatedMat = await MaterialModel.findById(materialId);
    expect(updatedMat?.status).toBe('queued');
    expect(updatedMat?.retryCount).toBe(1);
  });

  it('Cleans up storage files and Qdrant vectors when material is deleted', async () => {
    const user = await registerAndLoginUser('user9@example.com', 'User 9');
    const courseId = await createTestCourse(user);

    const textBuffer = createTestTextBuffer('# Notes\nPersistent notes to be deleted.');

    const uploadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/materials/upload`,
      headers: {
        cookie: `session_token=${user.cookie}`,
        'x-csrf-token': user.csrfToken,
      },
      payload: {
        filename: 'to_delete.md',
        contentBase64: textBuffer.toString('base64'),
      },
    });

    const body = JSON.parse(uploadRes.body) as ApiResponse<{ material: Material; job: IngestionJob }>;
    const materialId = body.data.material.id;
    const storageKey = body.data.material.storageKey;

    await worker.processJob(body.data.job.id);

    // Confirm file exists in storage and vector points exist
    expect(await storageService.exists(storageKey)).toBe(true);
    let points = vectorService.getStoredPoints(MATERIALS_COLLECTION);
    expect(points.some((p) => p.payload?.materialId === materialId)).toBe(true);

    // Delete material
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/courses/${courseId}/materials/${materialId}`,
      headers: {
        cookie: `session_token=${user.cookie}`,
        'x-csrf-token': user.csrfToken,
      },
    });

    expect(delRes.statusCode).toBe(200);

    // Verify storage file deleted
    expect(await storageService.exists(storageKey)).toBe(false);

    // Verify vector points deleted from Qdrant
    points = vectorService.getStoredPoints(MATERIALS_COLLECTION);
    expect(points.some((p) => p.payload?.materialId === materialId)).toBe(false);

    // Verify Material document deleted
    const matDoc = await MaterialModel.findById(materialId);
    expect(matDoc).toBeNull();
  });

  it('Detects scanned PDFs with insufficient text layer and prevents silent success', async () => {
    const { PdfAdapter } = await import('../src/modules/ingestion/adapters/pdf.adapter.js');
    const adapter = new PdfAdapter();

    // A minimal valid PDF structure with 0 text content
    const minimalBlankPdf = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF\n',
      'utf8'
    );

    await expect(adapter.extract(minimalBlankPdf, 'scanned_exam.pdf')).rejects.toThrow(
      /Scanned PDF document detected/i
    );
  });
});
