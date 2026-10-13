import { connectDatabase, disconnectDatabase } from './connection.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import {
  User,
  Session,
  CourseModel,
  MaterialModel,
  IngestionJobModel,
  ConversationModel,
  MessageModel,
  ConceptNoteModel,
  AssessmentModel,
  AssessmentAttemptModel,
  TopicMasteryModel,
  LearningEventModel,
  RecentMaterialModel,
  StudyGoalModel,
  StudyPlanModel,
  LearningObjectiveModel,
  RevisionScheduleModel,
} from './models/index.js';

interface ModelIndexTarget {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any;
}

const MODELS_TO_INDEX: ModelIndexTarget[] = [
  { name: 'User', model: User },
  { name: 'Session', model: Session },
  { name: 'Course', model: CourseModel },
  { name: 'Material', model: MaterialModel },
  { name: 'IngestionJob', model: IngestionJobModel },
  { name: 'Conversation', model: ConversationModel },
  { name: 'Message', model: MessageModel },
  { name: 'ConceptNote', model: ConceptNoteModel },
  { name: 'Assessment', model: AssessmentModel },
  { name: 'AssessmentAttempt', model: AssessmentAttemptModel },
  { name: 'TopicMastery', model: TopicMasteryModel },
  { name: 'LearningEvent', model: LearningEventModel },
  { name: 'RecentMaterial', model: RecentMaterialModel },
  { name: 'StudyGoal', model: StudyGoalModel },
  { name: 'StudyPlan', model: StudyPlanModel },
  { name: 'LearningObjective', model: LearningObjectiveModel },
  { name: 'RevisionSchedule', model: RevisionScheduleModel },
];

export async function initializeDatabaseIndexes(mongoUri = env.MONGODB_URI): Promise<void> {
  const startTime = Date.now();
  logger.info({ mongoUri: mongoUri.replace(/\/\/.*@/, '//***@') }, '🔧 Initializing MongoDB indexes...');

  await connectDatabase(mongoUri);

  let totalIndexesCreated = 0;

  for (const { name, model } of MODELS_TO_INDEX) {
    try {
      logger.info({ model: name }, `Ensuring indexes for ${name}...`);
      // syncIndexes drops indexes that are no longer defined in schema and builds new ones
      await model.syncIndexes();
      const indexes = await model.collection.indexes();
      totalIndexesCreated += indexes.length;
      logger.info(
        { model: name, indexCount: indexes.length, indexNames: indexes.map((i: { name: string }) => i.name) },
        `✅ ${name} indexes synchronized`
      );
    } catch (err) {
      logger.error({ model: name, err }, `⚠️ Failed to synchronize indexes for ${name}`);
      throw err;
    }
  }

  const durationMs = Date.now() - startTime;
  logger.info(
    { totalModels: MODELS_TO_INDEX.length, totalIndexesCreated, durationMs },
    '🎉 All database indexes initialized successfully'
  );
}

// Direct CLI execution
if (process.argv[1]?.endsWith('init-indexes.ts') || process.argv[1]?.endsWith('init-indexes.js')) {
  initializeDatabaseIndexes()
    .then(async () => {
      await disconnectDatabase();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.fatal({ err }, 'Database index initialization encountered a fatal error');
      await disconnectDatabase();
      process.exit(1);
    });
}
