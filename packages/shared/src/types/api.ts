export type HttpStatus = 200 | 201 | 400 | 401 | 403 | 404 | 409 | 422 | 500 | 503;

export interface ApiMeta {
  requestId: string;
  timestamp: string;
  durationMs?: number;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  statusCode: number;
  details?: ApiErrorDetail[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
  meta: ApiMeta;
}

export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface HealthCheckData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  environment: string;
  version: string;
  timestamp: string;
  services: {
    database: ServiceHealthStatus;
    vectorStore: ServiceHealthStatus;
    aiProvider: ServiceHealthStatus;
  };
}

export interface ReadinessCheckData {
  ready: boolean;
  services: {
    database: boolean;
    vectorStore: boolean;
  };
  timestamp: string;
}
