import mongoose from 'mongoose';
import {
  ConceptNoteModel,
  CourseModel,
} from '../../database/models/index.js';
import type { RagService } from '../rag/rag.service.js';
import type { IAIProvider } from '../../services/ai/index.js';
import { NotFoundError } from '../../utils/errors.js';
import type {
  StudyToolNote,
  GroundedSummaryResponse,
  GroundedFlashcardsResponse,
  SourceCitation,
} from '@omnitutor/shared';

export interface CreateNoteInput {
  courseId: string;
  category?: 'explanation' | 'revision' | 'summary' | 'flashcard';
  title: string;
  content: string;
  tags?: string[];
  citations?: SourceCitation[];
  flashcardData?: { front: string; back: string };
}

export interface SummaryInput {
  courseId: string;
  materialId?: string;
  topic?: string;
  style?: 'concise' | 'detailed' | 'bullet_points';
}

export interface FlashcardsInput {
  courseId: string;
  topic?: string;
  count?: number;
}

export class StudyToolsService {
  constructor(
    private readonly ragService: RagService,
    private readonly aiProvider: IAIProvider
  ) {}

  /**
   * Generate an AI summary strictly grounded in indexed course curriculum using verified RAG retrieval.
   */
  async generateGroundedSummary(
    userId: string,
    userRole: string,
    input: SummaryInput
  ): Promise<GroundedSummaryResponse> {
    const { courseId, materialId, topic, style = 'concise' } = input;

    // Use existing RAG service to verify access and retrieve evidence
    const query = topic ? `Summary of ${topic}` : 'Comprehensive overview of key concepts';
    const ragResult = await this.ragService.executeQuery(
      {
        courseId,
        materialId,
        query,
        topK: 6,
      },
      userId,
      userRole
    );

    if (!ragResult.hasSufficientEvidence) {
      return {
        summary: 'The uploaded curriculum does not contain sufficient material to synthesize a summary for this request.',
        citations: [],
      };
    }

    const contextSnippets = ragResult.citations
      .map((c) => `[Source ${c.id}] (File: ${c.originalFilename}${c.page ? `, Page ${c.page}` : ''}):\n${c.excerpt}`)
      .join('\n\n');

    const prompt = `You are OmniTutor AI. Summarize the following course curriculum material in a ${style} format.
Rules:
1. Every factual point MUST refer to the provided sources using bracketed citations like [Source CIT-1].
2. Do not invent any outside facts.
3. Distinguish core principles from secondary examples.

Evidence:
${contextSnippets}

Generate the structured summary now:`;

    const response = await this.aiProvider.generateCompletion(
      [
        {
          role: 'system',
          content: 'You are an educational study assistant that writes factual, grounded revision summaries with exact citations.',
        },
        { role: 'user', content: prompt },
      ],
      {
        temperature: 0.2,
        maxOutputTokens: 1000,
      }
    );

    return {
      summary: response.text,
      citations: ragResult.citations,
    };
  }

  /**
   * Generate study flashcards grounded in indexed course chunks with provenance citations.
   */
  async generateGroundedFlashcards(
    userId: string,
    userRole: string,
    input: FlashcardsInput
  ): Promise<GroundedFlashcardsResponse> {
    const { courseId, topic = 'core concepts', count = 5 } = input;

    const ragResult = await this.ragService.executeQuery(
      {
        courseId,
        query: `Key definitions, formulas, and principles of ${topic}`,
        topK: Math.min(count * 2, 8),
      },
      userId,
      userRole
    );

    if (!ragResult.hasSufficientEvidence) {
      return {
        topic,
        flashcards: [],
      };
    }

    const contextSnippets = ragResult.citations
      .map((c) => `[Citation ${c.id}]: ${c.excerpt}`)
      .join('\n\n');

    const prompt = `Based strictly on the following course excerpts, generate ${count} high-yield flashcards for revision.
Return ONLY valid JSON matching this schema:
{
  "flashcards": [
    {
      "front": "Prompt or concept question",
      "back": "Clear, concise definition or answer",
      "citationId": "CIT-X"
    }
  ]
}

Excerpts:
${contextSnippets}`;

    const completion = await this.aiProvider.generateCompletion(
      [
        {
          role: 'system',
          content: 'You are an adaptive curriculum specialist who generates accurate flashcards. Output valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      {
        temperature: 0.1,
      }
    );

    let items: Array<{ front: string; back: string; citationId?: string }> = [];
    try {
      const parsed = JSON.parse(completion.text);
      items = Array.isArray(parsed.flashcards) ? parsed.flashcards : [];
    } catch {
      // Fallback parse
      items = ragResult.citations.slice(0, count).map((c, i) => ({
        front: `Key Concept ${i + 1} from ${c.originalFilename}`,
        back: c.excerpt.slice(0, 180),
        citationId: c.id,
      }));
    }

    const citationMap = new Map<string, SourceCitation>();
    for (const c of ragResult.citations) {
      citationMap.set(c.id, c);
    }

    const flashcards = items.map((item, idx) => {
      const cit = item.citationId ? citationMap.get(item.citationId) : undefined;
      return {
        id: `fc-${idx + 1}-${Date.now().toString(36)}`,
        front: item.front,
        back: item.back,
        topic,
        citations: cit ? [cit] : ragResult.citations.slice(0, 1),
      };
    });

    return {
      topic,
      flashcards,
    };
  }

  /**
   * Persist a study note or flashcard.
   */
  async createNote(userId: string, input: CreateNoteInput): Promise<StudyToolNote> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const courseObjectId = new mongoose.Types.ObjectId(input.courseId);

    const course = await CourseModel.findById(courseObjectId);
    if (!course) {
      throw new NotFoundError(`Course ${input.courseId} not found`);
    }

    const note = await ConceptNoteModel.create({
      userId: userObjectId,
      courseId: courseObjectId,
      category: input.category || 'revision',
      title: input.title,
      content: input.content,
      tags: input.tags || [],
      citations: input.citations || [],
      flashcardData: input.flashcardData,
    });

    const resp = note.toResponse() as any;
    return {
      id: resp.id,
      userId: resp.userId,
      courseId: resp.courseId,
      category: resp.category || 'revision',
      title: resp.title,
      content: resp.content,
      tags: resp.tags,
      citations: resp.citations,
      flashcardData: resp.flashcardData,
      createdAt: resp.createdAt,
      updatedAt: resp.updatedAt,
    };
  }

  /**
   * List student's study notes with category and tag filters.
   */
  async listNotes(
    userId: string,
    filters: { courseId?: string; category?: string; tag?: string }
  ): Promise<StudyToolNote[]> {
    const query: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (filters.courseId && mongoose.isValidObjectId(filters.courseId)) {
      query.courseId = new mongoose.Types.ObjectId(filters.courseId);
    }
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.tag) {
      query.tags = filters.tag;
    }

    const notes = await ConceptNoteModel.find(query).sort({ createdAt: -1 });

    return notes.map((n) => {
      const resp = n.toResponse() as any;
      return {
        id: resp.id,
        userId: resp.userId,
        courseId: resp.courseId,
        category: resp.category || 'revision',
        title: resp.title,
        content: resp.content,
        tags: resp.tags,
        citations: resp.citations,
        flashcardData: resp.flashcardData,
        createdAt: resp.createdAt,
        updatedAt: resp.updatedAt,
      };
    });
  }

  async updateNote(
    userId: string,
    noteId: string,
    updates: { title?: string; content?: string; tags?: string[]; category?: string }
  ): Promise<StudyToolNote> {
    if (!mongoose.isValidObjectId(noteId)) {
      throw new NotFoundError(`Note ${noteId} not found`);
    }

    const note = await ConceptNoteModel.findOne({
      _id: new mongoose.Types.ObjectId(noteId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!note) {
      throw new NotFoundError(`Note ${noteId} not found`);
    }

    if (updates.title) note.title = updates.title;
    if (updates.content) note.content = updates.content;
    if (updates.tags) note.tags = updates.tags;
    if (updates.category) (note as any).category = updates.category;

    await note.save();
    const resp = note.toResponse() as any;
    return {
      id: resp.id,
      userId: resp.userId,
      courseId: resp.courseId,
      category: resp.category || 'revision',
      title: resp.title,
      content: resp.content,
      tags: resp.tags,
      citations: resp.citations,
      flashcardData: resp.flashcardData,
      createdAt: resp.createdAt,
      updatedAt: resp.updatedAt,
    };
  }

  async deleteNote(userId: string, noteId: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(noteId)) {
      throw new NotFoundError(`Note ${noteId} not found`);
    }

    const res = await ConceptNoteModel.deleteOne({
      _id: new mongoose.Types.ObjectId(noteId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    return res.deletedCount > 0;
  }
}
