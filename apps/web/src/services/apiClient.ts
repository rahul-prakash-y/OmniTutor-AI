import type { ApiResponse, HealthCheckData, ReadinessCheckData } from '@omnitutor/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
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

  public async getHealth(): Promise<ApiResponse<HealthCheckData>> {
    return this.request<HealthCheckData>('/health');
  }

  public async getReadiness(): Promise<ApiResponse<ReadinessCheckData>> {
    return this.request<ReadinessCheckData>('/ready');
  }
}

export const apiClient = new ApiClient();
