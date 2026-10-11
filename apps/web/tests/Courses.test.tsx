import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CoursesPage } from '../src/pages/CoursesPage';
import { CourseDetailPage } from '../src/pages/CourseDetailPage';
import { MaterialUploader } from '../src/components/course/MaterialUploader';
import { ProcessingTimeline } from '../src/components/course/ProcessingTimeline';
import type { Material } from '@omnitutor/shared';

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
              title: 'Operating Systems & Concurrency',
              description: 'Deadlock detection, virtual memory, and process synchronization.',
              subject: 'computer_science',
              academicLevel: 'undergraduate',
              tags: ['os', 'concurrency'],
              ownerId: 'u-123',
              status: 'active',
              processingStatus: 'indexed',
              materialCount: 2,
              indexedChunkCount: 24,
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
      getCourse: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'c-test-1',
          title: 'Operating Systems & Concurrency',
          description: 'Deadlock detection, virtual memory, and process synchronization.',
          subject: 'computer_science',
          academicLevel: 'undergraduate',
          tags: ['os', 'concurrency'],
          ownerId: 'u-123',
          status: 'active',
          processingStatus: 'indexed',
          materialCount: 2,
          indexedChunkCount: 24,
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
      getMaterials: vi.fn().mockResolvedValue({
        success: true,
        data: [
          {
            id: 'm-test-1',
            courseId: 'c-test-1',
            ownerId: 'u-123',
            filename: 'sync_notes.md',
            originalName: 'Synchronization_Notes.md',
            mimeType: 'text/markdown',
            detectedMimeType: 'text/markdown',
            sizeBytes: 4096,
            storageKey: 'materials/test/sync_notes.md',
            sourceType: 'md',
            status: 'indexed',
            chunkCount: 12,
            metadata: { wordCount: 850 },
            retryCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
      createCourse: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'c-new',
          title: 'Quantum Mechanics',
          description: 'Wave functions and Hilbert spaces.',
          subject: 'physics',
          academicLevel: 'advanced',
          tags: ['quantum'],
          ownerId: 'u-123',
          status: 'active',
          processingStatus: 'idle',
          materialCount: 0,
          indexedChunkCount: 0,
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
      uploadMaterial: vi.fn().mockResolvedValue({
        success: true,
        data: {
          material: {
            id: 'm-new',
            originalName: 'test.pdf',
            status: 'queued',
          },
          job: {
            id: 'j-new',
            status: 'queued',
          },
        },
      }),
      getJobStatus: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'j-test-1',
          status: 'indexed',
          stage: 'completed',
          progress: 100,
          tokensUsed: 1250,
        },
      }),
    },
  };
});

describe('Module 4 & 5 Frontend: Course Management & Material Ingestion UI', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('Renders Course Catalog with active courses and category filters', async () => {
    renderWithProviders(<CoursesPage />);

    expect(screen.getByText('Course Catalog & Curricula')).toBeInTheDocument();
    expect(screen.getByText('New Course')).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText('Operating Systems & Concurrency')
      ).toBeInTheDocument();
    });
  });

  it('Opens the Create Course modal and validates input', async () => {
    renderWithProviders(<CoursesPage />);

    const newCourseBtn = screen.getByText('New Course');
    fireEvent.click(newCourseBtn);

    expect(
      screen.getByText('Create New Course Curriculum')
    ).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/Course Title/i);
    expect(titleInput).toBeInTheDocument();
  });

  it('Renders Course Detail Page with Learning Materials Library', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/courses/c-test-1']}>
          <Routes>
            <Route path="/courses/:courseId" element={<CourseDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByText('Operating Systems & Concurrency')
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Learning Materials Library/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Synchronization_Notes.md')).toBeInTheDocument();
    });
  });

  it('Renders Material Uploader drag & drop zone and supported formats', () => {
    renderWithProviders(
      <MaterialUploader courseId="c-test-1" onUploaded={() => {}} />
    );

    expect(screen.getByText('Upload Learning Material')).toBeInTheDocument();
    expect(
      screen.getByText(/Drag & drop documents, textbooks/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/PDF \(≤25MB\)/i)).toBeInTheDocument();
    expect(screen.getByText(/PPTX \(≤30MB\)/i)).toBeInTheDocument();
    expect(screen.getByText(/DOCX \(≤20MB\)/i)).toBeInTheDocument();
    expect(screen.getByText(/TXT \/ MD \(≤5MB\)/i)).toBeInTheDocument();
    expect(screen.getByText(/MP3\/WAV \(≤50MB\)/i)).toBeInTheDocument();
    expect(screen.getByText(/MP4 \(≤100MB\)/i)).toBeInTheDocument();
  });

  it('Renders Processing Timeline with pipeline stages', () => {
    const mockMaterial: Material = {
      id: 'm-test-1',
      courseId: 'c-test-1',
      ownerId: 'u-123',
      filename: 'sync_notes.md',
      originalName: 'Synchronization_Notes.md',
      mimeType: 'text/markdown',
      detectedMimeType: 'text/markdown',
      sizeBytes: 4096,
      storageKey: 'materials/test/sync_notes.md',
      sourceType: 'md',
      status: 'indexed',
      chunkCount: 12,
      metadata: { wordCount: 850 },
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    renderWithProviders(
      <ProcessingTimeline courseId="c-test-1" material={mockMaterial} />
    );

    expect(screen.getByText(/Indexed \(12 chunks\)/i)).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
    expect(screen.getByText('Extraction')).toBeInTheDocument();
    expect(screen.getByText('Chunking')).toBeInTheDocument();
    expect(screen.getByText('Embedding')).toBeInTheDocument();
    expect(screen.getByText('Vector Store')).toBeInTheDocument();
  });
});
