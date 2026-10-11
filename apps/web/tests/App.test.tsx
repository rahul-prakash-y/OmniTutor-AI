import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

// Mock fetch for apiClient tests
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    json: () =>
      Promise.resolve({
        success: true,
        data: {
          status: 'healthy',
          uptimeSeconds: 42,
          environment: 'test',
          version: '0.1.0',
          timestamp: new Date().toISOString(),
          services: {
            database: { status: 'healthy', latencyMs: 2 },
            vectorStore: { status: 'healthy', latencyMs: 1 },
            aiProvider: { status: 'healthy' },
          },
        },
        meta: {
          requestId: 'test-req-123',
          timestamp: new Date().toISOString(),
        },
      }),
  })
);

describe('OmniTutor AI Web Frontend Shell', () => {
  it('Renders brand title and navigation links in the application shell', () => {
    render(<App />);

    expect(screen.getByText('OmniTutor AI')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Tutoring Sessions')).toBeInTheDocument();
    expect(screen.getByText('System & Services')).toBeInTheDocument();
  });

  it('Renders the adaptive tutoring hero and session launcher form', () => {
    render(<App />);

    expect(screen.getByText(/Adaptive Multimodal Tutoring/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Learning Topic or Problem Statement/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Launch Session/i })).toBeInTheDocument();
  });
});
