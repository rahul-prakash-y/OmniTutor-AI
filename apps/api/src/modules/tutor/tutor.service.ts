import mongoose from 'mongoose';
import type {
  Conversation,
  ConversationMessage,
  CreateConversationDto,
  UpdateConversationDto,
  SendMessageDto,
  CreateConceptNoteDto,
  ConceptNote,
  AcademicLevel,
  ExplanationStyle,
  SynthesizeSpeechDto,
  SpeechSynthesisResult,
} from '@omnitutor/shared';
import {
  ConversationModel,
  MessageModel,
  ConceptNoteModel,
} from '../../database/models/index.js';
import type { RagService } from '../rag/rag.service.js';
import type { IAIProvider } from '../../services/ai/ai.interface.js';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';

export interface TutorServiceOptions {
  ragService: RagService;
  aiProvider: IAIProvider;
}

export class TutorService {
  private ragService: RagService;
  protected aiProvider: IAIProvider;


  constructor(deps: TutorServiceOptions) {
    this.ragService = deps.ragService;
    this.aiProvider = deps.aiProvider;
  }

  /**
   * Start a new tutoring conversation
   */
  public async createConversation(
    courseId: string,
    userId: string,
    userRole: string,
    dto: CreateConversationDto
  ): Promise<Conversation> {
    const course = await this.ragService.verifyCourseAccess(courseId, userId, userRole);

    const title =
      dto.title?.trim() ||
      `${course.title}: ${dto.mode ? dto.mode.toUpperCase() : 'Socratic'} Session`;

    const conversation = await ConversationModel.create({
      courseId: new mongoose.Types.ObjectId(courseId),
      userId: new mongoose.Types.ObjectId(userId),
      materialId: dto.materialId ? new mongoose.Types.ObjectId(dto.materialId) : undefined,
      title,
      mode: dto.mode || 'socratic',
      academicLevel: dto.academicLevel || 'intermediate',
      explanationStyle: dto.explanationStyle || 'step_by_step',
      language: dto.language || 'en',
      isPinned: false,
      messageCount: 0,
    });

    return conversation.toResponse();
  }

  /**
   * List conversations for a course and user
   */
  public async listConversations(
    courseId: string,
    userId: string,
    userRole: string,
    limit = 20,
    offset = 0
  ): Promise<{ items: Conversation[]; total: number }> {
    await this.ragService.verifyCourseAccess(courseId, userId, userRole);

    const query: Record<string, unknown> = {
      courseId: new mongoose.Types.ObjectId(courseId),
    };

    if (userRole !== 'admin') {
      query.userId = new mongoose.Types.ObjectId(userId);
    }

    const [items, total] = await Promise.all([
      ConversationModel.find(query)
        .sort({ isPinned: -1, updatedAt: -1 })
        .skip(offset)
        .limit(limit),
      ConversationModel.countDocuments(query),
    ]);

    return {
      items: items.map((c) => c.toResponse()),
      total,
    };
  }

  /**
   * Get single conversation details
   */
  public async getConversation(
    conversationId: string,
    userId: string,
    userRole: string
  ): Promise<Conversation> {
    const conv = await ConversationModel.findById(conversationId);
    if (!conv) {
      throw new NotFoundError(`Conversation ${conversationId} not found`);
    }

    if (userRole !== 'admin' && conv.userId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to access this conversation');
    }

    return conv.toResponse();
  }

  /**
   * Update conversation title, pin state, or pedagogical modes
   */
  public async updateConversation(
    conversationId: string,
    userId: string,
    userRole: string,
    dto: UpdateConversationDto
  ): Promise<Conversation> {
    const conv = await ConversationModel.findById(conversationId);
    if (!conv) {
      throw new NotFoundError(`Conversation ${conversationId} not found`);
    }

    if (userRole !== 'admin' && conv.userId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to modify this conversation');
    }

    if (dto.title !== undefined) conv.title = dto.title.trim();
    if (dto.isPinned !== undefined) conv.isPinned = dto.isPinned;
    if (dto.mode !== undefined) conv.mode = dto.mode;
    if (dto.academicLevel !== undefined) conv.academicLevel = dto.academicLevel;
    if (dto.explanationStyle !== undefined) conv.explanationStyle = dto.explanationStyle;
    if (dto.language !== undefined) conv.language = dto.language;

    await conv.save();
    return conv.toResponse();
  }

  /**
   * Delete conversation and all its messages
   */
  public async deleteConversation(
    conversationId: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    const conv = await ConversationModel.findById(conversationId);
    if (!conv) {
      throw new NotFoundError(`Conversation ${conversationId} not found`);
    }

    if (userRole !== 'admin' && conv.userId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to delete this conversation');
    }

    await Promise.all([
      ConversationModel.findByIdAndDelete(conversationId),
      MessageModel.deleteMany({ conversationId: conv._id }),
    ]);
  }

  /**
   * Fetch conversation messages
   */
  public async getMessages(
    conversationId: string,
    userId: string,
    userRole: string,
    limit = 50,
    offset = 0
  ): Promise<{ items: ConversationMessage[]; total: number }> {
    const conv = await ConversationModel.findById(conversationId);
    if (!conv) {
      throw new NotFoundError(`Conversation ${conversationId} not found`);
    }

    if (userRole !== 'admin' && conv.userId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to view messages in this conversation');
    }

    const [messages, total] = await Promise.all([
      MessageModel.find({ conversationId: conv._id })
        .sort({ createdAt: 1 })
        .skip(offset)
        .limit(limit),
      MessageModel.countDocuments({ conversationId: conv._id }),
    ]);

    return {
      items: messages.map((m) => m.toResponse()),
      total,
    };
  }

  /**
   * Send student message, execute bounded-context RAG, and store assistant answer
   */
  public async sendMessage(
    conversationId: string,
    userId: string,
    userRole: string,
    dto: SendMessageDto
  ): Promise<ConversationMessage> {
    const conv = await ConversationModel.findById(conversationId);
    if (!conv) {
      throw new NotFoundError(`Conversation ${conversationId} not found`);
    }

    if (userRole !== 'admin' && conv.userId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to send messages to this conversation');
    }

    // 1. Persist user message
    const userMsg = await MessageModel.create({
      conversationId: conv._id,
      courseId: conv.courseId,
      userId: new mongoose.Types.ObjectId(userId),
      role: 'user',
      content: dto.content.trim(),
      citations: [],
      metadata: {
        academicLevel: dto.academicLevel || conv.academicLevel,
        explanationStyle: dto.explanationStyle || conv.explanationStyle,
        isHint: dto.requestHint,
      },
    });

    // 2. Fetch bounded recent history (last 6 messages) for conversational continuity
    const recentMessages = await MessageModel.find({
      conversationId: conv._id,
      _id: { $ne: userMsg._id },
    })
      .sort({ createdAt: -1 })
      .limit(6);

    const historyReversed = recentMessages.reverse();

    // 3. Formulate query using RAG engine
    const effectiveAcademicLevel = dto.academicLevel || conv.academicLevel;
    const effectiveExplanationStyle = dto.explanationStyle || conv.explanationStyle;
    const effectiveLanguage = dto.language || conv.language || 'en';
    const effectiveMaterialId = dto.materialId || (conv.materialId ? conv.materialId.toString() : undefined);

    // Build pedagogical instruction modifiers
    let styleGuide = '';
    if (dto.socraticStep === 'probe') {
      styleGuide = 'Socratic Probing Question: Do NOT provide the answer or complete explanation yet. Pose a focused, thought-provoking guiding question to test the student foundational intuition.';
    } else if (dto.socraticStep === 'hint' || dto.requestHint) {
      styleGuide = 'Socratic Hint: Provide a focused, sequential hint pointing toward the underlying principle without giving away the final resolution.';
    } else if (dto.socraticStep === 'synthesize') {
      styleGuide = 'Conceptual Synthesis: Prompt the student to connect their partial observation with the governing rule or invariant.';
    } else if (dto.socraticStep === 'explain') {
      styleGuide = 'Full Grounded Explanation: Now provide the complete, rigorous grounded explanation citing all supporting evidence with [cite:N] badges.';
    } else if (conv.mode === 'socratic') {
      styleGuide = 'Use the Socratic method: guide the student with targeted questions or sequential hints. Do not simply hand over the complete answer immediately.';
    } else if (effectiveExplanationStyle === 'step_by_step') {
      styleGuide = 'Provide a structured, step-by-step breakdown of the concept.';
    } else if (effectiveExplanationStyle === 'analogy') {
      styleGuide = 'Illustrate the core intuition using a vivid, accurate real-world analogy before delving into formal mechanics.';
    } else if (effectiveExplanationStyle === 'summary') {
      styleGuide = 'Provide a concise, high-density executive summary highlighting key takeaways and definitions.';
    } else if (effectiveExplanationStyle === 'revision_notes') {
      styleGuide = 'Format the explanation as bulleted revision notes with bold key terms and actionable memory cues.';
    }

    // Multilingual instructions preserving citations
    let languageGuide = '';
    if (effectiveLanguage && effectiveLanguage !== 'en') {
      languageGuide = ` Explain the concepts fluently in language "${effectiveLanguage}". CRITICAL CITATION REQUIREMENT: Preserve all citation tags [cite:N] pointing to the retrieved course material exactly as formatted without translating citation markers or altering chunk IDs.`;
    }

    const historyContext = historyReversed.length > 0
      ? `Prior conversation:\n${historyReversed.map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n')}\n\nStudent question: `
      : '';
    const ragQuery = `${historyContext}${dto.content}${styleGuide || languageGuide ? ` [Instruction: ${styleGuide}${languageGuide}]` : ''}`;

    // Execute grounded RAG query
    const ragResult = await this.ragService.executeQuery(
      {
        query: ragQuery,
        courseId: conv.courseId.toString(),
        materialId: effectiveMaterialId,
        academicLevel: effectiveAcademicLevel,
      },
      userId,
      userRole
    );

    // 4. Save assistant response
    const assistantMsg = await MessageModel.create({
      conversationId: conv._id,
      courseId: conv.courseId,
      userId: new mongoose.Types.ObjectId(userId),
      role: 'assistant',
      content: ragResult.answer,
      citations: ragResult.citations,
      metadata: {
        academicLevel: effectiveAcademicLevel,
        explanationStyle: effectiveExplanationStyle,
        sufficientEvidence: ragResult.hasSufficientEvidence,
        conflictDetected: ragResult.hasConflict,
        tokensUsed: ragResult.tokensUsed.totalTokens,
        durationMs: ragResult.durationMs,
        isHint: dto.requestHint || dto.socraticStep === 'hint',
        socraticStep: dto.socraticStep || (conv.mode === 'socratic' ? 'probe' : 'explain'),
        language: effectiveLanguage,
      },
    });

    // 5. Update conversation state
    conv.messageCount += 2;
    conv.lastMessagePreview = ragResult.answer.slice(0, 180);
    await conv.save();

    return assistantMsg.toResponse();
  }

  /**
   * Module 13 Priority 6: Voice-based tutoring speech synthesis metadata
   */
  public async synthesizeSpeech(dto: SynthesizeSpeechDto): Promise<SpeechSynthesisResult> {
    const wordCount = dto.text.trim().split(/\s+/).length;
    const speed = dto.speed || 1.0;
    const durationEstimateMs = Math.round((wordCount / (150 * speed)) * 60 * 1000);

    return {
      text: dto.text,
      language: dto.language || 'en',
      speed,
      status: 'synthesized',
      durationEstimateMs,
      webSpeechUtterance: {
        lang: dto.language || 'en',
        rate: speed,
        pitch: 1.0,
      },
    };
  }

  /**
   * Regenerate last assistant response
   */
  public async regenerateMessage(
    conversationId: string,
    messageId: string,
    userId: string,
    userRole: string,
    options?: {
      academicLevel?: AcademicLevel;
      explanationStyle?: ExplanationStyle;
    }
  ): Promise<ConversationMessage> {
    const conv = await ConversationModel.findById(conversationId);
    if (!conv) {
      throw new NotFoundError(`Conversation ${conversationId} not found`);
    }

    if (userRole !== 'admin' && conv.userId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to regenerate messages in this conversation');
    }

    const targetMsg = await MessageModel.findById(messageId);
    if (!targetMsg || targetMsg.conversationId.toString() !== conversationId) {
      throw new NotFoundError(`Message ${messageId} not found`);
    }

    // Find the associated user prompt
    let userPrompt = '';
    if (targetMsg.role === 'user') {
      userPrompt = targetMsg.content;
    } else {
      const prevUserMsg = await MessageModel.findOne({
        conversationId: conv._id,
        role: 'user',
        createdAt: { $lt: targetMsg.createdAt },
      }).sort({ createdAt: -1 });

      userPrompt = prevUserMsg?.content || 'Please elaborate on the previous topic.';
    }

    const effectiveLevel = options?.academicLevel || conv.academicLevel;

    const ragResult = await this.ragService.executeQuery(
      {
        query: userPrompt,
        courseId: conv.courseId.toString(),
        academicLevel: effectiveLevel,
      },
      userId,
      userRole
    );

    // If target message is assistant, update it in place; else create new assistant message
    if (targetMsg.role === 'assistant') {
      targetMsg.content = ragResult.answer;
      targetMsg.citations = ragResult.citations;
      targetMsg.metadata = {
        ...targetMsg.metadata,
        academicLevel: effectiveLevel,
        explanationStyle: options?.explanationStyle || conv.explanationStyle,
        tokensUsed: ragResult.tokensUsed.totalTokens,
        durationMs: ragResult.durationMs,
      };
      await targetMsg.save();
      return targetMsg.toResponse();
    } else {
      const newAssistantMsg = await MessageModel.create({
        conversationId: conv._id,
        courseId: conv.courseId,
        userId: new mongoose.Types.ObjectId(userId),
        role: 'assistant',
        content: ragResult.answer,
        citations: ragResult.citations,
        metadata: {
          academicLevel: effectiveLevel,
          explanationStyle: options?.explanationStyle || conv.explanationStyle,
          tokensUsed: ragResult.tokensUsed.totalTokens,
          durationMs: ragResult.durationMs,
        },
      });
      conv.messageCount += 1;
      await conv.save();
      return newAssistantMsg.toResponse();
    }
  }

  /**
   * Concept notes management
   */
  public async saveConceptNote(
    courseId: string,
    userId: string,
    userRole: string,
    dto: CreateConceptNoteDto
  ): Promise<ConceptNote> {
    await this.ragService.verifyCourseAccess(courseId, userId, userRole);

    const note = await ConceptNoteModel.create({
      courseId: new mongoose.Types.ObjectId(courseId),
      userId: new mongoose.Types.ObjectId(userId),
      conversationId: dto.conversationId ? new mongoose.Types.ObjectId(dto.conversationId) : undefined,
      title: dto.title.trim(),
      content: dto.content.trim(),
      tags: dto.tags || [],
      citations: dto.citations || [],
    });

    return note.toResponse();
  }

  public async listConceptNotes(
    courseId: string,
    userId: string,
    userRole: string
  ): Promise<ConceptNote[]> {
    await this.ragService.verifyCourseAccess(courseId, userId, userRole);

    const notes = await ConceptNoteModel.find({
      courseId: new mongoose.Types.ObjectId(courseId),
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 });

    return notes.map((n) => n.toResponse());
  }

  public async deleteConceptNote(
    noteId: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    const note = await ConceptNoteModel.findById(noteId);
    if (!note) {
      throw new NotFoundError(`Note ${noteId} not found`);
    }

    if (userRole !== 'admin' && note.userId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to delete this note');
    }

    await ConceptNoteModel.findByIdAndDelete(noteId);
  }
}
