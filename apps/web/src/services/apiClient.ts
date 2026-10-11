import type {
  ApiResponse,
  AuthResponse,
  HealthCheckData,
  ReadinessCheckData,
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
  UpdateProfileInput,
  UserProfile,
  Course,
  CreateCourseInput,
  UpdateCourseInput,
  CourseFilterQuery,
  Material,
  IngestionJob,
  RagQueryInput,
  RagQueryResult,
  RagDiagnosticInfo,
  Conversation,
  ConversationMessage,
  CreateConversationDto,
  UpdateConversationDto,
  SendMessageDto,
  CreateConceptNoteDto,
  ConceptNote,
  Assessment,
  AssessmentAttempt,
  GenerateAssessmentDto,
  QuestionSubmission,
  TopicMastery,
  StudentAnalyticsSummary,
  TopicMasteryAnalytics,
  AssessmentTrendPoint,
  StudyRecommendation,
  StudyGoal,
  StudyPlan,
  LearningEvent,
  GlobalSearchResponse,
  MaterialContentDetails,
  RecentMaterial,
  StudyToolNote,
  GroundedSummaryRequest,
  GroundedSummaryResponse,
  GroundedFlashcardsRequest,
  GroundedFlashcardsResponse,
} from '@omnitutor/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

export class ApiClient {
  private baseUrl: string;
  private csrfToken: string | null = null;

  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public setCsrfToken(token: string | null): void {
    this.csrfToken = token;
  }

  public getCsrfToken(): string | null {
    return this.csrfToken;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const method = options?.method?.toUpperCase() || 'GET';

    const isFormData = options?.body instanceof FormData;
    const headers: Record<string, string> = {};

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (options?.headers) {
      Object.assign(headers, options.headers);
    }

    // Attach CSRF token on state-changing requests if present
    if (this.csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      headers['x-csrf-token'] = this.csrfToken;
    }

    try {
      const res = await fetch(url, {
        ...options,
        credentials: 'include', // Ensures cookies are transmitted
        headers,
      });

      const data = (await res.json()) as ApiResponse<T>;
      return data;
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : 'Unable to connect to OmniTutor API server',
          statusCode: 0,
        },
        meta: {
          requestId: 'client-offline-err',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // --- Health Endpoints ---
  public async getHealth(): Promise<ApiResponse<HealthCheckData>> {
    return this.request<HealthCheckData>('/health');
  }

  public async getReadiness(): Promise<ApiResponse<ReadinessCheckData>> {
    return this.request<ReadinessCheckData>('/ready');
  }

  // --- Authentication Endpoints ---
  public async register(payload: RegisterInput): Promise<ApiResponse<AuthResponse>> {
    const res = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.success && res.data?.csrfToken) {
      this.setCsrfToken(res.data.csrfToken);
    }
    return res;
  }

  public async login(payload: LoginInput): Promise<ApiResponse<AuthResponse>> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.success && res.data?.csrfToken) {
      this.setCsrfToken(res.data.csrfToken);
    }
    return res;
  }

  public async logout(): Promise<ApiResponse<{ message: string }>> {
    const res = await this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
    this.setCsrfToken(null);
    return res;
  }

  public async getMe(): Promise<ApiResponse<AuthResponse>> {
    const res = await this.request<AuthResponse>('/auth/me', {
      method: 'GET',
    });
    if (res.success && res.data?.csrfToken) {
      this.setCsrfToken(res.data.csrfToken);
    }
    return res;
  }

  public async forgotPassword(payload: ForgotPasswordInput): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async resetPassword(payload: ResetPasswordInput): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async verifyEmail(payload: VerifyEmailInput): Promise<ApiResponse<{ user: UserProfile; verified: boolean }>> {
    return this.request<{ user: UserProfile; verified: boolean }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- User Profile Endpoints ---
  public async getProfile(): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>('/users/me', {
      method: 'GET',
    });
  }

  public async updateProfile(payload: UpdateProfileInput): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async deleteAccount(): Promise<ApiResponse<{ message: string }>> {
    const res = await this.request<{ message: string }>('/users/me', {
      method: 'DELETE',
    });
    this.setCsrfToken(null);
    return res;
  }

  // --- Course Endpoints (Module 4) ---
  public async getCourses(
    params?: Partial<CourseFilterQuery>
  ): Promise<ApiResponse<{ courses: Course[]; total: number; page: number; limit: number }>> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.subject) query.append('subject', params.subject);
    if (params?.academicLevel) query.append('academicLevel', params.academicLevel);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const qs = query.toString();
    return this.request<{ courses: Course[]; total: number; page: number; limit: number }>(
      `/courses${qs ? `?${qs}` : ''}`
    );
  }

  public async getCourse(courseId: string): Promise<ApiResponse<Course>> {
    return this.request<Course>(`/courses/${courseId}`);
  }

  public async createCourse(input: CreateCourseInput): Promise<ApiResponse<Course>> {
    return this.request<Course>('/courses', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  public async updateCourse(courseId: string, input: UpdateCourseInput): Promise<ApiResponse<Course>> {
    return this.request<Course>(`/courses/${courseId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  public async archiveCourse(courseId: string, isArchived: boolean): Promise<ApiResponse<Course>> {
    return this.request<Course>(`/courses/${courseId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ isArchived }),
    });
  }

  public async deleteCourse(courseId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/courses/${courseId}`, {
      method: 'DELETE',
    });
  }

  // --- Material & Upload Endpoints (Module 4 & 5) ---
  public async getMaterials(courseId: string): Promise<ApiResponse<Material[]>> {
    return this.request<Material[]>(`/courses/${courseId}/materials`);
  }

  public async uploadMaterial(
    courseId: string,
    file: File
  ): Promise<ApiResponse<{ material: Material; job: IngestionJob }>> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.request<{ material: Material; job: IngestionJob }>(
      `/courses/${courseId}/materials/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
  }

  public async deleteMaterial(
    courseId: string,
    materialId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(
      `/courses/${courseId}/materials/${materialId}`,
      {
        method: 'DELETE',
      }
    );
  }

  public async retryMaterial(
    courseId: string,
    materialId: string
  ): Promise<ApiResponse<IngestionJob>> {
    return this.request<IngestionJob>(
      `/courses/${courseId}/materials/${materialId}/retry`,
      {
        method: 'POST',
      }
    );
  }

  // --- Ingestion Status & Preview Endpoints (Module 5) ---
  public async getJobStatus(jobId: string): Promise<ApiResponse<IngestionJob>> {
    return this.request<IngestionJob>(`/ingestion/jobs/${jobId}`);
  }

  public async getCourseIngestionStatus(courseId: string): Promise<ApiResponse<IngestionJob[]>> {
    return this.request<IngestionJob[]>(`/courses/${courseId}/ingestion-status`);
  }

  public async getMaterialPreview(
    courseId: string,
    materialId: string
  ): Promise<
    ApiResponse<{
      materialTitle: string;
      sourceType: string;
      totalChunks: number;
      chunks: Array<{
        id: string;
        heading?: string;
        page?: number;
        slide?: number;
        timeRange?: { start: number; end: number };
        text: string;
        chunkIndex: number;
      }>;
    }>
  > {
    return this.request<{
      materialTitle: string;
      sourceType: string;
      totalChunks: number;
      chunks: Array<{
        id: string;
        heading?: string;
        page?: number;
        slide?: number;
        timeRange?: { start: number; end: number };
        text: string;
        chunkIndex: number;
      }>;
    }>(`/courses/${courseId}/materials/${materialId}/preview`);
  }

  // Dev helper to fetch tokens in development/test environments
  public async getDevTokens(): Promise<{ success: boolean; data: Array<{ to: string; type: string; token: string; url: string }> }> {
    const res = await fetch(`${this.baseUrl}/auth/dev-tokens`, { credentials: 'include' });
    return res.json();
  }

  // --- Module 6: RAG & Citations ---
  public async queryRag(
    courseId: string,
    payload: Omit<RagQueryInput, 'courseId'>
  ): Promise<ApiResponse<RagQueryResult>> {
    return this.request<RagQueryResult>(`/courses/${courseId}/rag/query`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getRagDiagnostics(
    courseId: string,
    payload: { query: string; materialId?: string; topK?: number; minScore?: number }
  ): Promise<ApiResponse<RagDiagnosticInfo>> {
    return this.request<RagDiagnosticInfo>(`/courses/${courseId}/rag/diagnostics`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getSourceChunk(
    courseId: string,
    chunkId: string
  ): Promise<ApiResponse<any>> {
    return this.request<any>(`/courses/${courseId}/rag/sources/${chunkId}`);
  }

  public async resolveCitation(chunkId: string): Promise<ApiResponse<any>> {
    return this.request<any>('/rag/citations/resolve', {
      method: 'POST',
      body: JSON.stringify({ chunkId }),
    });
  }

  // --- Module 7: AI Tutor & Conversations ---
  public async createConversation(
    courseId: string,
    payload: CreateConversationDto
  ): Promise<ApiResponse<Conversation>> {
    return this.request<Conversation>(`/courses/${courseId}/conversations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async listConversations(
    courseId: string,
    limit = 30,
    offset = 0
  ): Promise<ApiResponse<{ items: Conversation[]; total: number }>> {
    return this.request<{ items: Conversation[]; total: number }>(
      `/courses/${courseId}/conversations?limit=${limit}&offset=${offset}`
    );
  }

  public async getConversation(
    conversationId: string
  ): Promise<ApiResponse<Conversation>> {
    return this.request<Conversation>(`/conversations/${conversationId}`);
  }

  public async updateConversation(
    conversationId: string,
    payload: UpdateConversationDto
  ): Promise<ApiResponse<Conversation>> {
    return this.request<Conversation>(`/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async deleteConversation(
    conversationId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request<{ deleted: boolean }>(`/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  public async getConversationMessages(
    conversationId: string,
    limit = 50,
    offset = 0
  ): Promise<ApiResponse<{ items: ConversationMessage[]; total: number }>> {
    return this.request<{ items: ConversationMessage[]; total: number }>(
      `/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`
    );
  }

  public async sendConversationMessage(
    conversationId: string,
    payload: SendMessageDto
  ): Promise<ApiResponse<ConversationMessage>> {
    return this.request<ConversationMessage>(
      `/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  public async regenerateMessage(
    conversationId: string,
    messageId: string,
    payload?: { academicLevel?: any; explanationStyle?: any }
  ): Promise<ApiResponse<ConversationMessage>> {
    return this.request<ConversationMessage>(
      `/conversations/${conversationId}/messages/${messageId}/regenerate`,
      {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }
    );
  }

  public async createConceptNote(
    courseId: string,
    payload: CreateConceptNoteDto
  ): Promise<ApiResponse<ConceptNote>> {
    return this.request<ConceptNote>(`/courses/${courseId}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async listConceptNotes(
    courseId: string
  ): Promise<ApiResponse<ConceptNote[]>> {
    return this.request<ConceptNote[]>(`/courses/${courseId}/notes`);
  }

  public async deleteConceptNote(
    courseId: string,
    noteId: string
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request<{ deleted: boolean }>(`/courses/${courseId}/notes/${noteId}`, {
      method: 'DELETE',
    });
  }

  // --- Module 8: Adaptive Assessments ---
  public async generateAssessment(
    courseId: string,
    payload: GenerateAssessmentDto
  ): Promise<ApiResponse<Assessment>> {
    return this.request<Assessment>(`/courses/${courseId}/assessments/generate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async listAssessments(
    courseId: string,
    limit = 20,
    offset = 0
  ): Promise<ApiResponse<{ items: Assessment[]; total: number }>> {
    return this.request<{ items: Assessment[]; total: number }>(
      `/courses/${courseId}/assessments?limit=${limit}&offset=${offset}`
    );
  }

  public async getAssessment(
    assessmentId: string
  ): Promise<ApiResponse<Assessment>> {
    return this.request<Assessment>(`/assessments/${assessmentId}`);
  }

  public async submitAssessmentAttempt(
    assessmentId: string,
    responses: QuestionSubmission[]
  ): Promise<ApiResponse<AssessmentAttempt>> {
    return this.request<AssessmentAttempt>(`/assessments/${assessmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ responses }),
    });
  }

  public async getTopicMasteries(
    courseId: string
  ): Promise<ApiResponse<TopicMastery[]>> {
    return this.request<TopicMastery[]>(`/courses/${courseId}/assessments/mastery`);
  }

  public async getAssessmentAttempts(
    courseId: string
  ): Promise<ApiResponse<AssessmentAttempt[]>> {
    return this.request<AssessmentAttempt[]>(`/courses/${courseId}/assessments/attempts`);
  }

  // ==========================================
  // Module 9: Cognitive Analytics & Study Plans
  // ==========================================

  public async getAnalyticsSummary(
    timezone = 'UTC'
  ): Promise<ApiResponse<StudentAnalyticsSummary>> {
    return this.request<StudentAnalyticsSummary>(`/analytics/summary?timezone=${encodeURIComponent(timezone)}`);
  }

  public async getTopicMasteryAnalytics(
    courseId?: string
  ): Promise<ApiResponse<TopicMasteryAnalytics[]>> {
    const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
    return this.request<TopicMasteryAnalytics[]>(`/analytics/topics${query}`);
  }

  public async recordLearningEvent(
    payload: {
      eventType: string;
      courseId?: string;
      materialId?: string;
      topic?: string;
      durationSeconds?: number;
      metadata?: Record<string, unknown>;
      idempotencyKey?: string;
    }
  ): Promise<ApiResponse<LearningEvent>> {
    return this.request<LearningEvent>('/analytics/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getActivityHistory(
    query?: { courseId?: string; eventType?: string; from?: string; to?: string; page?: number; limit?: number }
  ): Promise<ApiResponse<{ items: LearningEvent[]; total: number; page: number; limit: number; totalPages: number }>> {
    const params = new URLSearchParams();
    if (query?.courseId) params.append('courseId', query.courseId);
    if (query?.eventType) params.append('eventType', query.eventType);
    if (query?.from) params.append('from', query.from);
    if (query?.to) params.append('to', query.to);
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/analytics/activity${qs}`);
  }

  public async getAssessmentTrends(
    courseId?: string
  ): Promise<ApiResponse<AssessmentTrendPoint[]>> {
    const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
    return this.request<AssessmentTrendPoint[]>(`/analytics/assessment-trends${query}`);
  }

  public async getPersonalizedRecommendations(): Promise<ApiResponse<StudyRecommendation[]>> {
    return this.request<StudyRecommendation[]>('/analytics/recommendations');
  }

  public async getStudyGoal(): Promise<ApiResponse<StudyGoal>> {
    return this.request<StudyGoal>('/analytics/study-goals');
  }

  public async setStudyGoal(payload: Partial<StudyGoal>): Promise<ApiResponse<StudyGoal>> {
    return this.request<StudyGoal>('/analytics/study-goals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getStudyPlan(courseId?: string): Promise<ApiResponse<StudyPlan | null>> {
    const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
    return this.request<StudyPlan | null>(`/analytics/study-plan${query}`);
  }

  public async generateStudyPlan(payload: {
    courseId: string;
    weeklyAvailableHours?: number;
    targetWeeks?: number;
    scheduleType?: string;
  }): Promise<ApiResponse<StudyPlan>> {
    return this.request<StudyPlan>('/analytics/study-plan/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateStudyPlanMilestone(
    planId: string,
    milestoneId: string,
    payload: { completed?: boolean; title?: string; description?: string; estimatedHours?: number }
  ): Promise<ApiResponse<StudyPlan>> {
    return this.request<StudyPlan>(`/analytics/study-plan/${planId}/milestones/${milestoneId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // ==========================================
  // Module 10: Global Search & Material Viewer
  // ==========================================

  public async globalSearch(
    options: { q: string; category?: string; courseId?: string; limit?: number; offset?: number; hybrid?: boolean },
    signal?: AbortSignal
  ): Promise<ApiResponse<GlobalSearchResponse>> {
    const params = new URLSearchParams();
    params.append('q', options.q);
    if (options.category) params.append('category', options.category);
    if (options.courseId) params.append('courseId', options.courseId);
    if (options.limit) params.append('limit', String(options.limit));
    if (options.offset) params.append('offset', String(options.offset));
    if (options.hybrid !== undefined) params.append('hybrid', String(options.hybrid));

    return this.request<GlobalSearchResponse>(`/search?${params.toString()}`, { signal });
  }

  public async getMaterialViewerContent(
    materialId: string
  ): Promise<ApiResponse<MaterialContentDetails>> {
    return this.request<MaterialContentDetails>(`/materials/${materialId}/viewer-content`);
  }

  public async recordRecentMaterialView(
    materialId: string,
    lastPosition?: { page?: number; timestamp?: number }
  ): Promise<ApiResponse<RecentMaterial>> {
    return this.request<RecentMaterial>(`/materials/${materialId}/recent`, {
      method: 'POST',
      body: JSON.stringify({ lastPosition }),
    });
  }

  public async getRecentMaterials(limit = 10): Promise<ApiResponse<RecentMaterial[]>> {
    return this.request<RecentMaterial[]>(`/materials/recent?limit=${limit}`);
  }

  public async generateGroundedSummary(
    payload: GroundedSummaryRequest
  ): Promise<ApiResponse<GroundedSummaryResponse>> {
    return this.request<GroundedSummaryResponse>('/study-tools/summaries/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async generateGroundedFlashcards(
    payload: GroundedFlashcardsRequest
  ): Promise<ApiResponse<GroundedFlashcardsResponse>> {
    return this.request<GroundedFlashcardsResponse>('/study-tools/flashcards/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getStudyNotes(
    filters?: { courseId?: string; category?: string; tag?: string }
  ): Promise<ApiResponse<StudyToolNote[]>> {
    const params = new URLSearchParams();
    if (filters?.courseId) params.append('courseId', filters.courseId);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.tag) params.append('tag', filters.tag);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<StudyToolNote[]>(`/study-tools/notes${qs}`);
  }

  public async createStudyNote(
    payload: {
      courseId: string;
      category?: string;
      title: string;
      content: string;
      tags?: string[];
      citations?: unknown[];
      flashcardData?: { front: string; back: string };
    }
  ): Promise<ApiResponse<StudyToolNote>> {
    return this.request<StudyToolNote>('/study-tools/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateStudyNote(
    id: string,
    payload: { title?: string; content?: string; tags?: string[]; category?: string }
  ): Promise<ApiResponse<StudyToolNote>> {
    return this.request<StudyToolNote>(`/study-tools/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async deleteStudyNote(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request<{ deleted: boolean }>(`/study-tools/notes/${id}`, {
      method: 'DELETE',
    });
  }
}


export const apiClient = new ApiClient();
