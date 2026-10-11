import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type {
  Assessment,
  AssessmentMode,
  AcademicLevel,
  AssessmentQuestion,
  ClientAssessmentQuestion,
} from '@omnitutor/shared';

export interface IAssessmentDocument extends Document {
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  mode: AssessmentMode;
  topic?: string;
  difficulty: AcademicLevel;
  version: number;
  questionCount: number;
  questions: AssessmentQuestion[];
  passingScorePercentage: number;
  timeLimitMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
  toClientResponse(): Assessment;
  toResponse(): Assessment;
}

const AssessmentSchema = new Schema<IAssessmentDocument>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    mode: {
      type: String,
      enum: [
        'quiz',
        'topic_practice',
        'chapter_assessment',
        'revision_test',
        'adaptive_session',
        'missed_practice',
      ],
      default: 'quiz',
    },
    topic: {
      type: String,
      maxlength: 120,
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'undergraduate', 'graduate'],
      default: 'intermediate',
    },
    version: {
      type: Number,
      default: 1,
    },
    questionCount: {
      type: Number,
      required: true,
    },
    questions: {
      type: Schema.Types.Mixed,
      required: true,
      default: [],
    },
    passingScorePercentage: {
      type: Number,
      default: 70,
    },
    timeLimitMinutes: {
      type: Number,
      default: 15,
    },
  },
  {
    timestamps: true,
  }
);

AssessmentSchema.index({ userId: 1, courseId: 1, createdAt: -1 });

// Client response strips out sensitive answers, rubrics, and explanations prior to submission
AssessmentSchema.methods.toClientResponse = function (): Assessment {
  const clientQuestions: ClientAssessmentQuestion[] = this.questions.map(
    (q: AssessmentQuestion) => ({
      id: q.id,
      topic: q.topic,
      learningObjective: q.learningObjective,
      difficulty: q.difficulty,
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      points: q.points,
      hints: q.hints,
    })
  );

  return {
    id: this._id.toString(),
    courseId: this.courseId.toString(),
    userId: this.userId.toString(),
    title: this.title,
    mode: this.mode,
    topic: this.topic,
    difficulty: this.difficulty,
    version: this.version,
    questionCount: this.questionCount,
    questions: [], // Cleared for security
    clientQuestions,
    passingScorePercentage: this.passingScorePercentage,
    timeLimitMinutes: this.timeLimitMinutes,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

AssessmentSchema.methods.toResponse = function (): Assessment {
  const clientQuestions: ClientAssessmentQuestion[] = this.questions.map(
    (q: AssessmentQuestion) => ({
      id: q.id,
      topic: q.topic,
      learningObjective: q.learningObjective,
      difficulty: q.difficulty,
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      points: q.points,
      hints: q.hints,
    })
  );

  return {
    id: this._id.toString(),
    courseId: this.courseId.toString(),
    userId: this.userId.toString(),
    title: this.title,
    mode: this.mode,
    topic: this.topic,
    difficulty: this.difficulty,
    version: this.version,
    questionCount: this.questionCount,
    questions: this.questions,
    clientQuestions,
    passingScorePercentage: this.passingScorePercentage,
    timeLimitMinutes: this.timeLimitMinutes,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const AssessmentModel: Model<IAssessmentDocument> =
  mongoose.models.Assessment ||
  mongoose.model<IAssessmentDocument>('Assessment', AssessmentSchema);
