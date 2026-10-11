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
}

export const apiClient = new ApiClient();
