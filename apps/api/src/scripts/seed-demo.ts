import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../database/connection.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { hashPassword } from '../utils/password.js';
import {
  User,
  CourseModel,
  MaterialModel,
  ConversationModel,
  MessageModel,
  AssessmentModel,
  TopicMasteryModel,
  ConceptNoteModel,
  RecentMaterialModel,
} from '../database/models/index.js';
import { QdrantService } from '../services/vector/qdrant.service.js';
import { MockVectorService } from '../services/vector/mock.vector.service.js';
import { GeminiEmbeddingProvider } from '../services/embedding/gemini.embedding.provider.js';
import { MockEmbeddingProvider } from '../services/embedding/mock.embedding.provider.js';
import { MATERIALS_COLLECTION } from '../modules/ingestion/ingestion.worker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate fixtures directory relative to repo root
const FIXTURES_DIR = path.resolve(__dirname, '../../../../fixtures/sample-course');

export async function seedDemoData(): Promise<void> {
  const startTime = Date.now();
  console.log('\n=============================================================');
  console.log('🌱 Starting OmniTutor AI Synthetic Demo Seeding Pipeline...');
  console.log('=============================================================\n');

  // 1. Connect Database
  await connectDatabase(env.MONGODB_URI);
  logger.info('Connected to MongoDB for demo seeding');

  // 2. Initialize Vector Storage & Embeddings
  const embeddingProvider = env.GEMINI_API_KEY
    ? new GeminiEmbeddingProvider(env.GEMINI_API_KEY)
    : new MockEmbeddingProvider(768);

  let vectorService: any = new QdrantService(env.QDRANT_URL, env.QDRANT_API_KEY);
  const qdrantOk = await vectorService.createCollectionIfNotExists(MATERIALS_COLLECTION);
  if (!qdrantOk) {
    logger.warn('Qdrant unavailable or offline, using MockVectorService for demo seeding');
    vectorService = new MockVectorService();
    await vectorService.createCollectionIfNotExists(MATERIALS_COLLECTION);
  } else {
    logger.info('Qdrant vector collection initialized');
  }

  // 3. Create or Reset Demo Student User
  const demoEmail = process.env.DEMO_USER_EMAIL || 'demo.student@omnitutor.ai';
  let demoPassword = process.env.DEMO_USER_PASSWORD;

  if (env.NODE_ENV === 'production') {
    if (!demoPassword || demoPassword === 'DemoStudent123!') {
      // Never create a default password in production: generate a cryptographically strong single-use password
      demoPassword = crypto.randomBytes(16).toString('base64url') + 'A1!';
      logger.warn('⚠️ PRODUCTION SEEDING DETECTED: Generated single-use secure random password for demo account.');
    }
  } else {
    demoPassword = demoPassword || 'DemoStudent123!';
  }

  let demoUser = await User.findOne({ email: demoEmail });
  if (demoUser) {
    logger.info('Demo user already exists, refreshing profile...');
    demoUser.isDeleted = false;
    demoUser.isEmailVerified = true;
    demoUser.fullName = 'Alex Rivera (Demo Student)';
    demoUser.passwordHash = await hashPassword(demoPassword);
    await demoUser.save();
  } else {
    logger.info('Creating demo student user...');
    demoUser = await User.create({
      email: demoEmail,
      fullName: 'Alex Rivera (Demo Student)',
      passwordHash: await hashPassword(demoPassword),
      role: 'student',
      isEmailVerified: true,
      preferences: {
        theme: 'dark',
        preferredDifficulty: 'intermediate',
        socraticPacing: 'balanced',
        enableSoundEffects: true,
      },
    });
  }

  // 4. Create Demo Course
  const courseTitle = 'CS301: Distributed Systems & Cloud Infrastructure';
  let demoCourse = await CourseModel.findOne({ owner: demoUser._id, title: courseTitle });
  if (demoCourse) {
    logger.info('Demo course already exists, using existing course...');
  } else {
    logger.info('Creating demo course...');
    demoCourse = await CourseModel.create({
      title: courseTitle,
      description:
        'Comprehensive curriculum covering consensus protocols (Raft, Paxos), logical time, vector clocks, and linearizable cloud architectures.',
      subject: 'Computer Science',
      academicLevel: 'advanced',
      owner: demoUser._id,
      tags: ['distributed-systems', 'consensus', 'raft', 'paxos', 'vector-clocks'],
      status: 'active',
      processingStatus: 'idle',
      materialCount: 0,
      indexedChunkCount: 0,
    });
  }

  const courseId = demoCourse._id.toString();

  // 5. Ingest Sample Course Fixtures
  const fixtureFiles = [
    { name: 'CS301_Distributed_Systems_Syllabus.md', title: 'Course Syllabus' },
    { name: 'Lecture_01_Consensus_Raft_Paxos.md', title: 'Lecture 01: Consensus (Raft & Paxos)' },
    { name: 'Lecture_02_Vector_Clocks_Consistency.md', title: 'Lecture 02: Logical Time & Vector Clocks' },
  ];

  let totalChunksIngested = 0;
  let lecture1MaterialId: string | null = null;

  for (const fixture of fixtureFiles) {
    const filePath = path.join(FIXTURES_DIR, fixture.name);
    if (!fs.existsSync(filePath)) {
      logger.warn({ filePath }, 'Fixture file missing, skipping');
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const existingMat = await MaterialModel.findOne({ courseId: demoCourse._id, originalName: fixture.name });

    let materialDoc = existingMat;
    if (!materialDoc) {
      materialDoc = await MaterialModel.create({
        courseId: demoCourse._id,
        ownerId: demoUser._id,
        filename: fixture.name,
        originalName: fixture.name,
        mimeType: 'text/markdown',
        detectedMimeType: 'text/markdown',
        sizeBytes: Buffer.byteLength(content, 'utf-8'),
        storageKey: `fixtures/${fixture.name}`,
        sourceType: 'md',
        status: 'indexed',
        chunkCount: 0,
        retryCount: 0,
        metadata: {
          title: fixture.title,
        },
      });
    }

    if (fixture.name.includes('Lecture_01')) {
      lecture1MaterialId = materialDoc._id.toString();
    }

    // Chunk text by markdown headers or sections
    const rawChunks = content
      .split(/(?=^##\s)/gm)
      .map((c) => c.trim())
      .filter((c) => c.length > 50);

    const vectorPoints = [];
    for (let i = 0; i < rawChunks.length; i++) {
      const chunkText = rawChunks[i]!;
      const chunkId = `demo-${materialDoc._id.toString()}-${i}`;
      const [vector] = await embeddingProvider.generateEmbeddings([chunkText]);

      vectorPoints.push({
        id: chunkId,
        vector,
        payload: {
          courseId,
          materialId: materialDoc._id.toString(),
          originalFilename: fixture.name,
          chunkIndex: i,
          text: chunkText,
          sourceType: 'md',
        },
      });
    }

    if (vectorPoints.length > 0) {
      await vectorService.upsertPoints(MATERIALS_COLLECTION, vectorPoints);
      totalChunksIngested += vectorPoints.length;
    }

    materialDoc.status = 'indexed';
    materialDoc.chunkCount = vectorPoints.length;
    await materialDoc.save();
  }

  demoCourse.materialCount = fixtureFiles.length;
  demoCourse.indexedChunkCount = totalChunksIngested;
  demoCourse.processingStatus = 'idle';
  await demoCourse.save();

  // 6. Seed Interactive Socratic Conversation
  const existingConv = await ConversationModel.findOne({ courseId: demoCourse._id, userId: demoUser._id });
  if (!existingConv) {
    logger.info('Creating demo Socratic tutoring conversation...');
    const conversation = await ConversationModel.create({
      courseId: demoCourse._id,
      userId: demoUser._id,
      title: 'Understanding FLP Impossibility and Raft Invariants',
      pedagogicalMode: 'socratic',
      socraticPacing: 'balanced',
      messageCount: 2,
      status: 'active',
    });

    await MessageModel.create([
      {
        conversationId: conversation._id,
        courseId: demoCourse._id,
        userId: demoUser._id,
        role: 'user',
        content: 'Can Raft achieve consensus if a majority of nodes partition into an isolated network?',
        sequenceNumber: 1,
      },
      {
        conversationId: conversation._id,
        courseId: demoCourse._id,
        userId: demoUser._id,
        role: 'assistant',
        content:
          'Under the Raft protocol, a leader requires a strict majority quorum ($N/2 + 1$) to commit any log entries [cite:1]. If the leader is in a minority network partition, it cannot replicate entries across a majority of nodes and therefore will not commit new commands. Meanwhile, a majority partition can safely elect a new leader and proceed. This satisfies Raft’s Safety Invariant [cite:2].\n\nWhat do you predict happens to the minority leader’s uncommitted log entries once the network partition heals?',
        citations: [
          {
            citationId: 1,
            materialId: lecture1MaterialId || courseId,
            sourceType: 'md',
            snippet:
              'An entry is committed once the leader that created the entry has replicated it on a majority of servers.',
            confidenceScore: 0.94,
          },
          {
            citationId: 2,
            materialId: lecture1MaterialId || courseId,
            sourceType: 'md',
            snippet:
              'Safety Invariants: If any server has applied a log entry at a given index, no other server will ever apply a different log entry.',
            confidenceScore: 0.91,
          },
        ],
        sequenceNumber: 2,
      },
    ]);
  }

  // 7. Seed Dynamic Adaptive Assessment Quiz
  const examFixturePath = path.join(FIXTURES_DIR, 'Practice_Exam_Questions.json');
  if (fs.existsSync(examFixturePath)) {
    const existingAssessment = await AssessmentModel.findOne({ courseId: demoCourse._id, userId: demoUser._id });
    if (!existingAssessment) {
      logger.info('Creating demo adaptive assessment...');
      const examData = JSON.parse(fs.readFileSync(examFixturePath, 'utf-8'));

      await AssessmentModel.create({
        courseId: demoCourse._id,
        userId: demoUser._id,
        title: 'Midterm Assessment: Consensus & Logical Clocks',
        mode: 'quiz',
        topic: examData.topic,
        difficulty: examData.difficulty,
        version: 1,
        questionCount: examData.questions.length,
        questions: examData.questions,
        passingScorePercentage: 70,
        timeLimitMinutes: 15,
        status: 'published',
      });
    }
  }

  // 8. Seed Topic Mastery Analytics
  await TopicMasteryModel.findOneAndUpdate(
    { courseId: demoCourse._id, userId: demoUser._id, topic: 'Consensus Foundations' },
    {
      courseId: demoCourse._id,
      userId: demoUser._id,
      topic: 'Consensus Foundations',
      masteryScore: 85,
      level: 'intermediate',
      attemptsCount: 3,
      correctCount: 26,
      totalQuestions: 30,
      lastAssessedAt: new Date(),
    },
    { upsert: true }
  );

  await TopicMasteryModel.findOneAndUpdate(
    { courseId: demoCourse._id, userId: demoUser._id, topic: 'Logical Time & Vector Clocks' },
    {
      courseId: demoCourse._id,
      userId: demoUser._id,
      topic: 'Logical Time & Vector Clocks',
      masteryScore: 78,
      level: 'intermediate',
      attemptsCount: 2,
      correctCount: 16,
      totalQuestions: 20,
      lastAssessedAt: new Date(),
    },
    { upsert: true }
  );

  // 9. Seed Study Tools Note & Recent History
  await ConceptNoteModel.findOneAndUpdate(
    { courseId: demoCourse._id, userId: demoUser._id, title: 'FLP Impossibility Quick Reference' },
    {
      courseId: demoCourse._id,
      userId: demoUser._id,
      category: 'summary',
      title: 'FLP Impossibility Quick Reference',
      content:
        'In asynchronous distributed networks with crash failures, no deterministic consensus protocol can guarantee both safety and liveness. Systems must sacrifice liveness to ensure safety.',
      tags: ['theory', 'consensus', 'flp'],
    },
    { upsert: true }
  );

  if (lecture1MaterialId) {
    await RecentMaterialModel.findOneAndUpdate(
      { userId: demoUser._id, materialId: new mongoose.Types.ObjectId(lecture1MaterialId) },
      {
        userId: demoUser._id,
        courseId: demoCourse._id,
        materialId: new mongoose.Types.ObjectId(lecture1MaterialId),
        title: 'Lecture 01: Consensus in Distributed Systems',
        sourceType: 'md',
        lastPosition: {
          page: 2,
          percentage: 45,
          sectionTitle: 'The Raft Consensus Algorithm',
        },
        accessedAt: new Date(),
      },
      { upsert: true }
    );
  }

  const durationMs = Date.now() - startTime;

  console.log('\n=============================================================');
  console.log('✨ OMNITUTOR AI DEMO SEEDING COMPLETED IN ' + durationMs + 'ms');
  console.log('=============================================================');
  console.log('🧑 Demo User Email    : ' + demoEmail);
  console.log('🔑 Demo User Password : ' + demoPassword);
  console.log('📚 Course Title       : ' + courseTitle);
  console.log('🆔 Course ID          : ' + courseId);
  console.log('📦 Total Chunks       : ' + totalChunksIngested);
  console.log('🌐 Web Application    : http://localhost:5173 or http://localhost:80');
  console.log('📡 API Base URL       : http://localhost:4000/api/v1');
  console.log('=============================================================\n');
}

// Direct CLI execution
if (process.argv[1]?.endsWith('seed-demo.ts') || process.argv[1]?.endsWith('seed-demo.js')) {
  seedDemoData()
    .then(async () => {
      await disconnectDatabase();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.fatal({ err }, 'Demo seeding encountered a fatal error');
      await disconnectDatabase();
      process.exit(1);
    });
}
