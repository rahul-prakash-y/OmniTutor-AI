import mongoose from 'mongoose';
import {
  CourseModel,
  MaterialModel,
  ConceptNoteModel,
  ConversationModel,
  MessageModel,
  AssessmentModel,
} from '../../database/models/index.js';
import type { IVectorService } from '../../services/vector/index.js';
import type { IEmbeddingProvider } from '../../services/embedding/index.js';
import { MATERIALS_COLLECTION } from '../ingestion/ingestion.worker.js';
import type {
  GlobalSearchResponse,
  SearchResultItem,
  SearchResultCategory,
} from '@omnitutor/shared';

export interface SearchOptions {
  query: string;
  category?: 'all' | SearchResultCategory;
  courseId?: string;
  limit?: number;
  offset?: number;
  hybrid?: boolean;
}

export class SearchService {
  constructor(
    private readonly vectorService: IVectorService,
    private readonly embeddingProvider?: IEmbeddingProvider
  ) {}

  /**
   * Execute permission-aware global search across courses, materials, chunks, notes, and conversations.
   */
  async search(
    userId: string,
    userRole: string,
    options: SearchOptions
  ): Promise<GlobalSearchResponse> {
    const {
      query,
      category = 'all',
      courseId,
      limit = 20,
      offset = 0,
      hybrid = true,
    } = options;

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return {
        query: '',
        total: 0,
        results: [],
        categoriesCount: {
          course: 0,
          material: 0,
          chunk: 0,
          note: 0,
          conversation: 0,
          assessment: 0,
        },
      };
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1. Resolve authorized courses for this user to enforce strict permission filtering
    let authorizedCourseIds: mongoose.Types.ObjectId[] = [];
    if (userRole === 'admin') {
      const allCourses = await CourseModel.find({}).select('_id');
      authorizedCourseIds = allCourses.map((c) => c._id as mongoose.Types.ObjectId);
    } else {
      const permittedCourses = await CourseModel.find({
        owner: userObjectId,
      }).select('_id');
      authorizedCourseIds = permittedCourses.map((c) => c._id as mongoose.Types.ObjectId);
    }

    // If a specific courseId is requested, ensure user is authorized for it
    if (courseId && mongoose.isValidObjectId(courseId)) {
      const requestedId = new mongoose.Types.ObjectId(courseId);
      const isAllowed = authorizedCourseIds.some((id) => id.equals(requestedId));
      if (!isAllowed && userRole !== 'admin') {
        authorizedCourseIds = [];
      } else {
        authorizedCourseIds = [requestedId];
      }
    }

    const results: SearchResultItem[] = [];
    const categoriesCount: Record<SearchResultCategory, number> = {
      course: 0,
      material: 0,
      chunk: 0,
      note: 0,
      conversation: 0,
      assessment: 0,
    };

    // Safe regex pattern escaping for keyword matching
    const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    // 2. Course search
    if (category === 'all' || category === 'course') {
      if (authorizedCourseIds.length > 0) {
        const courses = await CourseModel.find({
          _id: { $in: authorizedCourseIds },
          $or: [{ title: regex }, { subject: regex }, { description: regex }],
        })
          .limit(limit)
          .select('_id title subject description');

        for (const c of courses) {
          categoriesCount.course++;
          results.push({
            id: c._id.toString(),
            category: 'course',
            title: c.title,
            snippet: c.description
              ? this.extractSnippet(c.description, trimmedQuery)
              : `Subject: ${c.subject}`,
            courseId: c._id.toString(),
            courseTitle: c.title,
            relevanceScore: 0.95,
            linkUrl: `/courses/${c._id.toString()}`,
          });
        }
      }
    }

    // 3. Materials search
    if (category === 'all' || category === 'material') {
      if (authorizedCourseIds.length > 0) {
        const materials = await MaterialModel.find({
          courseId: { $in: authorizedCourseIds },
          originalName: regex,
        })
          .populate('courseId', 'title')
          .limit(limit);

        for (const m of materials) {
          const course = m.courseId as any;
          categoriesCount.material++;
          results.push({
            id: m._id.toString(),
            category: 'material',
            title: m.originalName,
            snippet: `File: ${m.originalName} (${m.mimeType || 'Document'})`,
            courseId: m.courseId._id ? m.courseId._id.toString() : m.courseId.toString(),
            courseTitle: course?.title,
            materialId: m._id.toString(),
            materialTitle: m.originalName,
            relevanceScore: 0.9,
            linkUrl: `/courses/${m.courseId._id || m.courseId}?materialId=${m._id.toString()}`,
          });
        }
      }
    }

    // 4. Indexed content chunks (Semantic vector search via Qdrant)
    if (category === 'all' || category === 'chunk') {
      if (authorizedCourseIds.length > 0 && hybrid && this.embeddingProvider) {
        try {
          const queryVector = await this.embeddingProvider.generateEmbedding(trimmedQuery);
          for (const cId of authorizedCourseIds.slice(0, 3)) {
            const vectorHits = await this.vectorService.search(
              MATERIALS_COLLECTION,
              queryVector,
              5,
              { courseId: cId.toString() }
            );

            for (const hit of vectorHits) {
              if (hit.score > 0.6) {
                const chunkId = String(hit.payload?.chunkId || hit.id);
                if (!results.some((r) => r.id === chunkId)) {
                  categoriesCount.chunk++;
                  results.push({
                    id: chunkId,
                    category: 'chunk',
                    title: String(hit.payload?.heading || hit.payload?.originalFilename || 'Curriculum Evidence'),
                    snippet: this.extractSnippet(
                      String(hit.payload?.content || hit.payload?.text || ''),
                      trimmedQuery
                    ),
                    courseId: cId.toString(),
                    materialId: hit.payload?.materialId ? String(hit.payload.materialId) : undefined,
                    location: {
                      pageNumber: hit.payload?.page as number | undefined,
                      slideNumber: hit.payload?.slide as number | undefined,
                    },
                    relevanceScore: Number(hit.score.toFixed(3)),
                    linkUrl: `/courses/${cId.toString()}?chunkId=${chunkId}`,
                  });
                }
              }
            }
          }
        } catch {
          // Graceful fallback if vector search is temporarily offline
        }
      }
    }

    // 5. Saved Notes / Explanations
    if (category === 'all' || category === 'note') {
      const notes = await ConceptNoteModel.find({
        userId: userObjectId,
        $or: [{ title: regex }, { content: regex }, { tags: regex }],
      })
        .populate('courseId', 'title')
        .limit(limit);

      for (const n of notes) {
        const course = n.courseId as any;
        categoriesCount.note++;
        results.push({
          id: n._id.toString(),
          category: 'note',
          title: n.title,
          snippet: this.extractSnippet(n.content, trimmedQuery),
          courseId: n.courseId._id ? n.courseId._id.toString() : n.courseId.toString(),
          courseTitle: course?.title,
          relevanceScore: 0.88,
          linkUrl: `/tutor?courseId=${n.courseId._id || n.courseId}&noteId=${n._id.toString()}`,
        });
      }
    }

    // 6. Tutor Conversations & Chat Messages
    if (category === 'all' || category === 'conversation') {
      const conversations = await ConversationModel.find({
        userId: userObjectId,
        title: regex,
      })
        .populate('courseId', 'title')
        .limit(Math.min(limit, 5));

      for (const conv of conversations) {
        const course = conv.courseId as any;
        categoriesCount.conversation++;
        results.push({
          id: conv._id.toString(),
          category: 'conversation',
          title: conv.title,
          snippet: conv.lastMessagePreview || `Conversation in ${course?.title || 'Course'}`,
          courseId: conv.courseId._id ? conv.courseId._id.toString() : conv.courseId.toString(),
          courseTitle: course?.title,
          relevanceScore: 0.82,
          linkUrl: `/tutor?conversationId=${conv._id.toString()}`,
        });
      }

      // Check messages
      const messages = await MessageModel.find({
        userId: userObjectId,
        content: regex,
      })
        .limit(Math.min(limit, 5));

      for (const msg of messages) {
        categoriesCount.conversation++;
        results.push({
          id: msg._id.toString(),
          category: 'conversation',
          title: `Message in Tutor Session`,
          snippet: this.extractSnippet(msg.content, trimmedQuery),
          courseId: msg.courseId.toString(),
          relevanceScore: 0.8,
          linkUrl: `/tutor?conversationId=${msg.conversationId.toString()}`,
        });
      }
    }

    // 7. Assessments
    if (category === 'all' || category === 'assessment') {
      if (authorizedCourseIds.length > 0) {
        const assessments = await AssessmentModel.find({
          courseId: { $in: authorizedCourseIds },
          $or: [{ title: regex }, { topic: regex }],
        })
          .populate('courseId', 'title')
          .limit(limit);

        for (const ass of assessments) {
          const course = ass.courseId as any;
          categoriesCount.assessment++;
          results.push({
            id: ass._id.toString(),
            category: 'assessment',
            title: ass.title,
            snippet: `Topic: ${ass.topic} | Mode: ${ass.mode}`,
            courseId: ass.courseId._id ? ass.courseId._id.toString() : ass.courseId.toString(),
            courseTitle: course?.title,
            relevanceScore: 0.84,
            linkUrl: `/assessments/${ass._id.toString()}`,
          });
        }
      }
    }

    // Sort combined results by relevance score descending
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const paginated = results.slice(offset, offset + limit);

    return {
      query: trimmedQuery,
      total: results.length,
      results: paginated,
      categoriesCount,
    };
  }

  private extractSnippet(text: string, query: string): string {
    if (!text) return '';
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) {
      return text.slice(0, 160) + (text.length > 160 ? '...' : '');
    }
    const start = Math.max(0, idx - 60);
    const end = Math.min(text.length, idx + query.length + 80);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < text.length ? '...' : '';
    return prefix + text.slice(start, end).replace(/\s+/g, ' ') + suffix;
  }
}
