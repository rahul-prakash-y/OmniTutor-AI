import mongoose from 'mongoose';
import {
  LearningEventModel,
  TopicMasteryModel,
  StudyGoalModel,
  StudyPlanModel,
  AssessmentAttemptModel,
  CourseModel,
  MaterialModel,
} from '../../database/models/index.js';
import type {
  LearningEvent,
  StudentAnalyticsSummary,
  TopicMasteryAnalytics,
  AssessmentTrendPoint,
  StudyRecommendation,
  StudyGoal,
  StudyPlan,
} from '@omnitutor/shared';

export interface RecordEventInput {
  eventType: 'assessment_submission' | 'tutor_interaction' | 'material_view' | 'concept_reviewed' | 'active_study_session';
  courseId?: string;
  materialId?: string;
  topic?: string;
  durationSeconds?: number;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface ActivityHistoryQuery {
  courseId?: string;
  eventType?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export class AnalyticsService {
  /**
   * Record an active learning event idempotently.
   * Caps durationSeconds to prevent treating idle open tabs as active study time.
   */
  async recordLearningEvent(userId: string, input: RecordEventInput): Promise<LearningEvent> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Idempotency check to avoid double-counting
    if (input.idempotencyKey) {
      const existing = await LearningEventModel.findOne({
        idempotencyKey: input.idempotencyKey,
        userId: userObjectId,
      });
      if (existing) {
        return existing.toResponse();
      }
    }

    const durationSeconds = Math.min(Math.max(input.durationSeconds || 60, 1), 7200);

    const event = await LearningEventModel.create({
      userId: userObjectId,
      eventType: input.eventType,
      courseId: input.courseId && mongoose.isValidObjectId(input.courseId)
        ? new mongoose.Types.ObjectId(input.courseId)
        : undefined,
      materialId: input.materialId && mongoose.isValidObjectId(input.materialId)
        ? new mongoose.Types.ObjectId(input.materialId)
        : undefined,
      topic: input.topic,
      durationSeconds,
      metadata: input.metadata || {},
      idempotencyKey: input.idempotencyKey,
      timestamp: new Date(),
    });

    return event.toResponse();
  }

  /**
   * Aggregate student summary metrics: questions, accuracy, active study time, real streaks, and course statuses.
   */
  async getStudentSummary(userId: string, timezone = 'UTC'): Promise<StudentAnalyticsSummary> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1. Assessment attempts summary
    const attempts = await AssessmentAttemptModel.find({
      userId: userObjectId,
      status: 'submitted',
    }).select('totalScore maxScore responses startedAt submittedAt');

    let totalQuestionsAttempted = 0;
    let totalQuestionsCorrect = 0;

    for (const attempt of attempts) {
      if (Array.isArray(attempt.responses)) {
        totalQuestionsAttempted += attempt.responses.length;
        totalQuestionsCorrect += attempt.responses.filter((r) => r.isCorrect).length;
      }
    }

    const overallAccuracy =
      totalQuestionsAttempted > 0
        ? Math.round((totalQuestionsCorrect / totalQuestionsAttempted) * 1000) / 10
        : 0;

    // 2. Reliable active study time from LearningEventModel (capped to active events)
    const allEvents = await LearningEventModel.find({
      userId: userObjectId,
    }).select('durationSeconds timestamp');

    const totalDurationSeconds = allEvents.reduce((acc, ev) => acc + (ev.durationSeconds || 0), 0);
    const activeStudyTimeMinutes = Math.round(totalDurationSeconds / 60);

    // Past 7 days active minutes
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyEvents = allEvents.filter((ev) => ev.timestamp >= sevenDaysAgo);
    const weeklyStudyTimeMinutes = Math.round(
      weeklyEvents.reduce((acc, ev) => acc + (ev.durationSeconds || 0), 0) / 60
    );

    // Daily breakdown for last 7 days
    const dailyMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateKey = this.formatDateInTimezone(d, timezone);
      dailyMap.set(dateKey, 0);
    }

    for (const ev of allEvents) {
      const dateKey = this.formatDateInTimezone(ev.timestamp, timezone);
      if (dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + Math.round(ev.durationSeconds / 60));
      }
    }

    const dailyActiveMinutes = Array.from(dailyMap.entries()).map(([date, minutes]) => ({
      date,
      minutes,
    }));

    // 3. Real study streak calculation based on actual learning activity days
    const { currentStreakDays, longestStreakDays } = this.calculateStreaks(
      allEvents.map((e) => e.timestamp),
      timezone
    );

    // 4. Topics needing revision count
    const topicsNeedingRevisionCount = await TopicMasteryModel.countDocuments({
      userId: userObjectId,
      $or: [{ recommendedRevision: true }, { masteryScore: { $lt: 45 } }],
    });

    // 5. Course completion metrics
    const userCourses = await CourseModel.find({
      owner: userObjectId,
    }).select('_id status');

    const completedCoursesCount = userCourses.filter((c) => c.status === 'archived').length;
    const inProgressCoursesCount = userCourses.filter((c) => c.status === 'active' || c.status === 'draft').length;

    const lastEvent = allEvents.length > 0 && allEvents[0]
      ? allEvents.reduce((latest, ev) => (ev.timestamp > latest ? ev.timestamp : latest), allEvents[0].timestamp)
      : undefined;

    return {
      totalQuestionsAttempted,
      totalQuestionsCorrect,
      overallAccuracy,
      activeStudyTimeMinutes,
      weeklyStudyTimeMinutes,
      dailyActiveMinutes,
      currentStreakDays,
      longestStreakDays,
      topicsNeedingRevisionCount,
      completedCoursesCount,
      inProgressCoursesCount,
      lastActiveAt: lastEvent ? lastEvent.toISOString() : undefined,
    };
  }

  /**
   * Calculate consecutive active day streaks given an array of timestamps and a timezone.
   */
  calculateStreaks(
    timestamps: Date[],
    timezone = 'UTC'
  ): { currentStreakDays: number; longestStreakDays: number } {
    if (!timestamps || timestamps.length === 0) {
      return { currentStreakDays: 0, longestStreakDays: 0 };
    }

    const uniqueDays = Array.from(
      new Set(timestamps.map((t) => this.formatDateInTimezone(t, timezone)))
    ).sort(); // Ascending order YYYY-MM-DD

    if (uniqueDays.length === 0) {
      return { currentStreakDays: 0, longestStreakDays: 0 };
    }

    // Longest streak
    let longestStreak = 1;
    let currentRun = 1;

    for (let i = 1; i < uniqueDays.length; i++) {
      const prevDate = new Date(uniqueDays[i - 1] + 'T00:00:00Z');
      const currDate = new Date(uniqueDays[i] + 'T00:00:00Z');
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentRun++;
        if (currentRun > longestStreak) {
          longestStreak = currentRun;
        }
      } else if (diffDays > 1) {
        currentRun = 1;
      }
    }

    // Current streak (must include today or yesterday)
    const todayStr = this.formatDateInTimezone(new Date(), timezone);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayStr = this.formatDateInTimezone(yesterday, timezone);

    const lastActiveDay = uniqueDays[uniqueDays.length - 1];
    let currentStreakDays = 0;

    if (lastActiveDay === todayStr || lastActiveDay === yesterdayStr) {
      currentStreakDays = 1;
      let checkDate = new Date(lastActiveDay + 'T00:00:00Z');

      for (let i = uniqueDays.length - 2; i >= 0; i--) {
        const prevDayDate = new Date(uniqueDays[i] + 'T00:00:00Z');
        const diffDays = Math.round((checkDate.getTime() - prevDayDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreakDays++;
          checkDate = prevDayDate;
        } else {
          break;
        }
      }
    }

    return {
      currentStreakDays,
      longestStreakDays: Math.max(longestStreak, currentStreakDays),
    };
  }

  private formatDateInTimezone(date: Date, timezone = 'UTC'): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(date); // YYYY-MM-DD
    } catch {
      return date.toISOString().slice(0, 10);
    }
  }

  /**
   * Get estimated topic mastery with clear estimated indicators.
   */
  async getTopicMasteryList(userId: string, courseId?: string): Promise<TopicMasteryAnalytics[]> {
    const filter: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(userId),
    };
    if (courseId && mongoose.isValidObjectId(courseId)) {
      filter.courseId = new mongoose.Types.ObjectId(courseId);
    }

    const records = await TopicMasteryModel.find(filter)
      .populate('courseId', 'title')
      .sort({ masteryScore: 1, lastAssessedAt: -1 });

    return records.map((r) => {
      const course = r.courseId as any;
      return {
        topic: r.topic,
        courseId: r.courseId._id ? r.courseId._id.toString() : r.courseId.toString(),
        courseTitle: course?.title || 'Course',
        estimatedMasteryScore: r.masteryScore,
        attemptCount: r.attemptCount,
        correctCount: r.correctCount,
        currentDifficulty: r.currentDifficulty,
        recommendedRevision: r.recommendedRevision,
        revisionReason: r.revisionReason,
        lastAssessedAt: r.lastAssessedAt.toISOString(),
      };
    });
  }

  /**
   * Paginated activity history with date filters.
   */
  async getActivityHistory(userId: string, query: ActivityHistoryQuery) {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(Math.max(query.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (query.courseId && mongoose.isValidObjectId(query.courseId)) {
      filter.courseId = new mongoose.Types.ObjectId(query.courseId);
    }
    if (query.eventType) {
      filter.eventType = query.eventType;
    }
    if (query.from || query.to) {
      filter.timestamp = {};
      if (query.from) filter.timestamp.$gte = new Date(query.from);
      if (query.to) filter.timestamp.$lte = new Date(query.to);
    }

    const [events, total] = await Promise.all([
      LearningEventModel.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      LearningEventModel.countDocuments(filter),
    ]);

    return {
      items: events.map((e) => e.toResponse()),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Assessment score trends over time.
   */
  async getAssessmentTrends(userId: string, courseId?: string): Promise<AssessmentTrendPoint[]> {
    const filter: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(userId),
      status: 'submitted',
    };
    if (courseId && mongoose.isValidObjectId(courseId)) {
      filter.courseId = new mongoose.Types.ObjectId(courseId);
    }

    const attempts = await AssessmentAttemptModel.find(filter)
      .populate('assessmentId', 'title difficulty')
      .sort({ startedAt: 1 })
      .limit(50);

    return attempts.map((att) => {
      const assessment = att.assessmentId as any;
      const pct =
        att.maxScore > 0
          ? Math.round((att.totalScore / att.maxScore) * 1000) / 10
          : 0;

      return {
        attemptId: att._id.toString(),
        assessmentId: assessment?._id ? assessment._id.toString() : att.assessmentId.toString(),
        assessmentTitle: assessment?.title || 'Assessment',
        courseId: att.courseId.toString(),
        score: att.totalScore,
        totalPossibleScore: att.maxScore,
        percentage: pct,
        difficulty: assessment?.difficulty || 'medium',
        completedAt: att.submittedAt ? att.submittedAt.toISOString() : att.startedAt.toISOString(),
      };
    });
  }

  /**
   * Personalized recommendations with explicit explanations for each suggestion.
   */
  async getPersonalizedRecommendations(userId: string): Promise<StudyRecommendation[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const recommendations: StudyRecommendation[] = [];

    // 1. Weak topics ($M < 45 or recommendedRevision)
    const weakTopics = await TopicMasteryModel.find({
      userId: userObjectId,
      $or: [{ recommendedRevision: true }, { masteryScore: { $lt: 45 } }],
    })
      .populate('courseId', 'title')
      .sort({ masteryScore: 1 })
      .limit(3);

    for (const wt of weakTopics) {
      const course = wt.courseId as any;
      recommendations.push({
        id: `rec-weak-${wt._id.toString()}`,
        type: 'weak_topic',
        title: `Revisit Weak Concept: ${wt.topic}`,
        reason:
          wt.revisionReason ||
          `Estimated topic mastery is currently ${wt.masteryScore}% based on ${wt.attemptCount} recent questions.`,
        courseId: wt.courseId._id ? wt.courseId._id.toString() : wt.courseId.toString(),
        courseTitle: course?.title,
        topic: wt.topic,
        actionUrl: `/tutor?courseId=${wt.courseId._id || wt.courseId}&topic=${encodeURIComponent(wt.topic)}`,
        priority: 'high',
      });
    }

    // 2. Recommend related materials for learning gaps
    if (weakTopics.length > 0 && weakTopics[0]) {
      const primaryWeak = weakTopics[0];
      const relatedMaterial = await MaterialModel.findOne({
        courseId: primaryWeak.courseId,
        status: 'indexed',
      }).select('_id originalName');

      if (relatedMaterial) {
        recommendations.push({
          id: `rec-mat-${relatedMaterial._id.toString()}`,
          type: 'material_gap',
          title: `Review Core Material: ${relatedMaterial.originalName}`,
          reason: `Covers fundamentals directly associated with current learning gap in "${primaryWeak.topic}".`,
          courseId: primaryWeak.courseId._id ? primaryWeak.courseId._id.toString() : primaryWeak.courseId.toString(),
          materialId: relatedMaterial._id.toString(),
          actionUrl: `/courses/${primaryWeak.courseId._id || primaryWeak.courseId}?materialId=${relatedMaterial._id.toString()}`,
          priority: 'medium',
        });
      }

      // 3. Follow-up quiz recommendation
      recommendations.push({
        id: `rec-quiz-${primaryWeak._id.toString()}`,
        type: 'follow_up_quiz',
        title: `Quick Revision Quiz on ${primaryWeak.topic}`,
        reason: 'Reinforces recently missed questions through retrieval practice.',
        courseId: primaryWeak.courseId._id ? primaryWeak.courseId._id.toString() : primaryWeak.courseId.toString(),
        topic: primaryWeak.topic,
        actionUrl: `/assessments?mode=revision_test&topic=${encodeURIComponent(primaryWeak.topic)}`,
        priority: 'medium',
      });
    }

    // 4. Study plan milestone progression
    const activePlan = await StudyPlanModel.findOne({
      userId: userObjectId,
      status: 'active',
    }).populate('courseId', 'title');

    if (activePlan) {
      const nextMilestone = activePlan.milestones.find((m) => !m.completed);
      if (nextMilestone) {
        const course = activePlan.courseId as any;
        recommendations.push({
          id: `rec-plan-${nextMilestone.id}`,
          type: 'next_milestone',
          title: `Study Plan: ${nextMilestone.title}`,
          reason: `Scheduled for Week ${nextMilestone.week} (${nextMilestone.estimatedHours} hrs estimated).`,
          courseId: activePlan.courseId._id ? activePlan.courseId._id.toString() : activePlan.courseId.toString(),
          courseTitle: course?.title,
          actionUrl: `/progress?planId=${activePlan._id.toString()}`,
          priority: 'high',
        });
      }
    }

    return recommendations;
  }

  /**
   * Study goals: get or update.
   */
  async getStudyGoal(userId: string): Promise<StudyGoal> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    let goal = await StudyGoalModel.findOne({ userId: userObjectId });
    if (!goal) {
      goal = await StudyGoalModel.create({
        userId: userObjectId,
        weeklyHoursTarget: 5,
        dailyMinutesTarget: 45,
        targetAssessmentsPerWeek: 3,
        timezone: 'UTC',
      });
    }
    return goal.toResponse();
  }

  async setStudyGoal(userId: string, payload: Partial<StudyGoal>): Promise<StudyGoal> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const goal = await StudyGoalModel.findOneAndUpdate(
      { userId: userObjectId },
      {
        $set: {
          weeklyHoursTarget: payload.weeklyHoursTarget ?? 5,
          dailyMinutesTarget: payload.dailyMinutesTarget ?? 45,
          targetAssessmentsPerWeek: payload.targetAssessmentsPerWeek ?? 3,
          timezone: payload.timezone || 'UTC',
          targetCompletionDate: payload.targetCompletionDate ? new Date(payload.targetCompletionDate) : undefined,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return goal.toResponse();
  }

  /**
   * Personalized study plan generation based on course structure and student's available hours.
   */
  async generateStudyPlan(
    userId: string,
    courseId: string,
    options: { weeklyAvailableHours: number; targetWeeks: number; scheduleType: 'weekly' | 'custom' | 'exam_prep' }
  ): Promise<StudyPlan> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const courseObjectId = new mongoose.Types.ObjectId(courseId);

    const course = await CourseModel.findById(courseObjectId);
    if (!course) {
      throw new Error('Course not found');
    }

    // Inspect course materials
    const materials = await MaterialModel.find({ courseId: courseObjectId }).select('originalName');
    const topicSet = new Set<string>();
    for (const mat of materials) {
      const cleanName = mat.originalName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      topicSet.add(cleanName);
    }
    if (course.subject) topicSet.add(`${course.subject} Core`);
    const topicsList = Array.from(topicSet);
    if (topicsList.length === 0) {
      topicsList.push(`${course.title} Foundations`, `${course.title} Intermediate Applications`, `${course.title} Synthesis`);
    }

    const weeks = Math.max(options.targetWeeks || 4, 1);
    const topicsPerWeek = Math.max(Math.ceil(topicsList.length / weeks), 1);
    const weeklyHours = options.weeklyAvailableHours || 6;

    const milestones: any[] = [];
    for (let w = 1; w <= weeks; w++) {
      const startIndex = (w - 1) * topicsPerWeek;
      const weekTopics = topicsList.slice(startIndex, startIndex + topicsPerWeek);
      const isFinalWeek = w === weeks;

      milestones.push({
        id: `ms-${w}-${Date.now().toString(36)}`,
        week: w,
        title: isFinalWeek ? `Final Review & Comprehensive Assessment` : `Week ${w}: ${weekTopics[0] || 'Core Concepts'}`,
        description: isFinalWeek
          ? 'Comprehensive mastery review and full practice test.'
          : `Deep dive into ${weekTopics.join(', ')} with AI tutor practice.`,
        topics: weekTopics.length > 0 ? weekTopics : [course.title],
        estimatedHours: weeklyHours,
        completed: false,
        actionType: isFinalWeek ? 'quiz_practice' : w % 2 === 0 ? 'tutor_review' : 'read_material',
      });
    }

    const targetCompletionDate = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000);

    // Archive any prior active plan for this course
    await StudyPlanModel.updateMany(
      { userId: userObjectId, courseId: courseObjectId, status: 'active' },
      { $set: { status: 'archived' } }
    );

    const plan = await StudyPlanModel.create({
      userId: userObjectId,
      courseId: courseObjectId,
      title: `${course.title} Personalized Study Plan`,
      scheduleType: options.scheduleType,
      weeklyAvailableHours: weeklyHours,
      targetCompletionDate,
      milestones,
      status: 'active',
    });

    return plan.toResponse(course.title);
  }

  async getStudyPlan(userId: string, courseId?: string): Promise<StudyPlan | null> {
    const filter: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(userId),
      status: 'active',
    };
    if (courseId && mongoose.isValidObjectId(courseId)) {
      filter.courseId = new mongoose.Types.ObjectId(courseId);
    }

    const plan = await StudyPlanModel.findOne(filter).populate('courseId', 'title');
    if (!plan) return null;

    const course = plan.courseId as any;
    return plan.toResponse(course?.title);
  }

  async updateMilestone(
    userId: string,
    planId: string,
    milestoneId: string,
    updates: { completed?: boolean; title?: string; description?: string; estimatedHours?: number }
  ): Promise<StudyPlan> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const plan = await StudyPlanModel.findOne({
      _id: new mongoose.Types.ObjectId(planId),
      userId: userObjectId,
    }).populate('courseId', 'title');

    if (!plan) {
      throw new Error('Study plan not found');
    }

    const milestone = plan.milestones.find((m) => m.id === milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found');
    }

    if (updates.completed !== undefined) {
      milestone.completed = updates.completed;
      milestone.completedAt = updates.completed ? new Date() : undefined;
    }
    if (updates.title) milestone.title = updates.title;
    if (updates.description) milestone.description = updates.description;
    if (updates.estimatedHours) milestone.estimatedHours = updates.estimatedHours;

    await plan.save();
    const course = plan.courseId as any;
    return plan.toResponse(course?.title);
  }
}

export const analyticsService = new AnalyticsService();
