const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';
export class ApiClient {
    baseUrl;
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }
    async request(endpoint, options) {
        const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        try {
            const res = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
            });
            const data = (await res.json());
            return data;
        }
        catch (err) {
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
    async getHealth() {
        return this.request('/health');
    }
    async getReadiness() {
        return this.request('/ready');
    }
}
export const apiClient = new ApiClient();
