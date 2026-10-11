import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CitationPopover } from '../src/components/CitationPopover';
import { TutorPage } from '../src/pages/TutorPage';
import { AssessmentsPage } from '../src/pages/AssessmentsPage';
import type { SourceCitation } from '@omnitutor/shared';

// Mock apiClient
vi.mock('../src/services/apiClient', () => {
  return {
    apiClient: {
      getCourses: vi.fn().mockResolvedValue({
        success: true,
        data: {
          courses: [
            {
              id: 'c-test-1',
              title: 'Distributed Systems 101',
              description: 'Raft consensus and fault tolerance models.',
              subject: 'computer_science',
              academicLevel: 'intermediate',
              tags: ['distributed', 'consensus'],
              ownerId: 'u-123',
              status: 'active',
              processingStatus: 'indexed',
              materialCount: 2,
              indexedChunkCount: 12,
              isArchived: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
      }),
      listConversations: vi.fn().mockResolvedValue({
        success: true,
        data: {
          items: [
            {
              id: 'conv-test-1',
              courseId: 'c-test-1',
              userId: 'u-123',
              title: 'Raft Protocol Discussion',
              mode: 'socratic',
              academicLevel: 'intermediate',
              explanationStyle: 'step_by_step',
              isPinned: true,
              messageCount: 2,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          total: 1,
        },
      }),
      getConversationMessages: vi.fn().mockResolvedValue({
        success: true,
        data: {
          items: [
            {
              id: 'msg-1',
              conversationId: 'conv-test-1',
              courseId: 'c-test-1',
              userId: 'u-123',
              role: 'user',
              content: 'How do leader elections work in Raft?',
              citations: [],
              createdAt: new Date().toISOString(),
            },
            {
              id: 'msg-2',
              conversationId: 'conv-test-1',
              courseId: 'c-test-1',
              userId: 'u-123',
              role: 'assistant',
              content:
                'Raft uses randomized election timeouts to elect leaders smoothly. [cite:1] Nodes transition to candidate state.',
              citations: [
                {
                  id: 'cite-1',
                  chunkId: 'chunk-raft-1',
                  materialId: 'mat-raft-1',
                  originalFilename: 'raft_consensus.pdf',
                  sourceType: 'pdf',
                  page: 4,
                  excerpt: 'Raft uses randomized election timers ranging between 150ms and 300ms.',
                  contentHash: 'hash-123',
                  score: 0.94,
                },
              ],
              createdAt: new Date().toISOString(),
            },
          ],
          total: 2,
        },
      }),
      createConversation: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'conv-test-new',
          courseId: 'c-test-1',
          userId: 'u-123',
          title: 'New Socratic Session',
          mode: 'socratic',
          academicLevel: 'intermediate',
          explanationStyle: 'step_by_step',
          isPinned: false,
          messageCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
      sendConversationMessage: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'msg-3',
          conversationId: 'conv-test-1',
          courseId: 'c-test-1',
          userId: 'u-123',
          role: 'assistant',
          content: 'Here is an analogy: think of randomized timers as contestants bidding in an auction.',
          citations: [],
          createdAt: new Date().toISOString(),
        },
      }),
      listConceptNotes: vi.fn().mockResolvedValue({
        success: true,
        data: [
          {
            id: 'note-1',
            courseId: 'c-test-1',
            userId: 'u-123',
            title: 'Raft Election Timeout Rule',
            content: 'Election timeouts should be randomized to prevent split votes.',
            tags: ['socratic', 'intermediate'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
      createConceptNote: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'note-2',
          courseId: 'c-test-1',
          userId: 'u-123',
          title: 'Heartbeat Broadcasts',
          content: 'Leaders periodically broadcast heartbeats to maintain authority.',
          tags: ['socratic'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
      listAssessments: vi.fn().mockResolvedValue({
        success: true,
        data: {
          items: [
            {
              id: 'asm-1',
              courseId: 'c-test-1',
              userId: 'u-123',
              title: 'Quick Quiz: Distributed Systems 101',
              mode: 'quiz',
              topic: 'Raft Consensus',
              difficulty: 'intermediate',
              version: 1,
              questionCount: 5,
              passingScorePercentage: 70,
              timeLimitMinutes: 15,
              clientQuestions: [],
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
        },
      }),
      getTopicMasteries: vi.fn().mockResolvedValue({
        success: true,
        data: [
          {
            id: 'tm-1',
            courseId: 'c-test-1',
            userId: 'u-123',
            topic: 'Leader Election',
            masteryScore: 78,
            currentDifficulty: 'intermediate',
            streakCount: 2,
            attemptCount: 3,
            correctCount: 2,
            recommendedRevision: false,
            lastAssessedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
      getAssessmentAttempts: vi.fn().mockResolvedValue({
        success: true,
        data: [],
      }),
    },
  };
});

describe('Module 6 & 7 Frontend: Citation Popover, Tutor Workspace & Assessments UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders CitationPopover, opens provenance overlay, and displays file excerpt and page coordinate', async () => {
    const citation: SourceCitation = {
      id: 'cite-1',
      chunkId: 'chunk-os-1',
      materialId: 'mat-os-1',
      originalFilename: 'operating_systems_silberschatz.pdf',
      sourceType: 'pdf',
      page: 142,
      excerpt: 'Deadlock can occur when four Coffman conditions hold simultaneously.',
      contentHash: 'hash-999',
      score: 0.95,
    };

    const handleOpenMaterial = vi.fn();

    render(
      <CitationPopover
        citation={citation}
        index={0}
        onOpenMaterial={handleOpenMaterial}
      />
    );

    // Initial button pill with source index
    const triggerBtn = screen.getByRole('button');
    expect(triggerBtn).toBeInTheDocument();
    expect(triggerBtn).toHaveTextContent('[1]');

    // Click to open popover
    fireEvent.click(triggerBtn);

    // Inspect popover content
    expect(screen.getByText('operating_systems_silberschatz.pdf')).toBeInTheDocument();
    expect(screen.getByText('Page 142')).toBeInTheDocument();
    expect(
      screen.getByText(/Deadlock can occur when four Coffman conditions hold simultaneously/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByText('Open Material')).toBeInTheDocument();

    // Click "Open Material"
    fireEvent.click(screen.getByText('Open Material'));
    expect(handleOpenMaterial).toHaveBeenCalledWith('mat-os-1');
  });

  it('renders OmniTutor AI workspace with session history, pedagogical controls and message timeline', async () => {
    render(
      <MemoryRouter>
        <TutorPage />
      </MemoryRouter>
    );

    // Title banner
    expect(await screen.findByText('OmniTutor AI Cognitive Workspace')).toBeInTheDocument();
    expect(screen.getByText('RAG Grounded')).toBeInTheDocument();

    // Conversation sidebar
    expect(await screen.findByText('Raft Protocol Discussion')).toBeInTheDocument();

    // Messages area
    expect(
      await screen.findByText('How do leader elections work in Raft?')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Raft uses randomized election timeouts to elect leaders smoothly/i)
    ).toBeInTheDocument();

    // Pedagogical controls exist
    expect(screen.getByRole('button', { name: /^socratic$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^direct$/i })).toBeInTheDocument();
    expect(screen.getByText('Ask Hint')).toBeInTheDocument();
  });

  it('renders AssessmentsPage with course mastery telemetry, available quizzes and generation modal', async () => {
    render(
      <MemoryRouter>
        <AssessmentsPage />
      </MemoryRouter>
    );

    // Header
    expect(await screen.findByText('Dynamic Adaptive Assessments')).toBeInTheDocument();
    expect(screen.getByText('Generate Assessment')).toBeInTheDocument();

    // Topic mastery bar
    expect(await screen.findByText('Leader Election')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();

    // Available quiz card
    expect(
      await screen.findByText('Quick Quiz: Distributed Systems 101')
    ).toBeInTheDocument();
    expect(screen.getByText('Start Quiz')).toBeInTheDocument();
  });
});
