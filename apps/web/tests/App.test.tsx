import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('OmniTutor AI SaaS Application Shell & Design System', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('Renders brand identity and complete navigation suite', () => {
    render(<App />);

    expect(screen.getAllByText('OmniTutor AI')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Dashboard')[0]).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /My Courses/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /AI Tutor/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Assessments/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Progress/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Settings/i })).toBeInTheDocument();
  });

  it('Renders dashboard header, metrics row, and continue learning section', () => {
    render(<App />);

    expect(screen.getByText(/Welcome back, Rahul/i)).toBeInTheDocument();
    expect(screen.getByText('Learning Streak')).toBeInTheDocument();
    expect(screen.getByText('Weekly Time')).toBeInTheDocument();
    expect(screen.getByText('Mastery Index')).toBeInTheDocument();
    expect(screen.getByText('Active Courses')).toBeInTheDocument();
    expect(screen.getByText('Continue Learning')).toBeInTheDocument();
  });

  it('Toggles between populated view and empty state view on the dashboard', async () => {
    render(<App />);

    const toggleBtn = screen.getByRole('button', { name: /Preview Empty State/i });
    expect(toggleBtn).toBeInTheDocument();

    // Click to activate empty state
    fireEvent.click(toggleBtn);
    expect(screen.getByText(/No Learning History Found/i)).toBeInTheDocument();

    // Click restore
    const restoreBtn = screen.getByRole('button', { name: /Restore Data View/i });
    fireEvent.click(restoreBtn);
    expect(screen.getByText('Continue Learning')).toBeInTheDocument();
  });

  it('Opens and closes the global search command palette', async () => {
    render(<App />);

    const searchBtn = screen.getByRole('button', { name: /Search courses, topics.../i });
    fireEvent.click(searchBtn);

    expect(screen.getByRole('dialog', { name: /Global Search Command Palette/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search courses, concepts, assessments/i)).toBeInTheDocument();

    // Close on escape
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Global Search Command Palette/i })).not.toBeInTheDocument();
    });
  });

  it('Toggles theme mode between light and dark on button click', () => {
    render(<App />);

    const themeBtn = screen.getByRole('button', { name: /Switch to (light|dark) theme/i });
    expect(themeBtn).toBeInTheDocument();

    const initiallyDark = document.documentElement.classList.contains('dark');
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(!initiallyDark);
  });
});
