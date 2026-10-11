import { IngestionJobModel } from '../../database/models/ingestion-job.model.js';
import { CourseModel } from '../../database/models/course.model.js';
import { MaterialModel } from '../../database/models/material.model.js';
import type { IVectorService } from '../../services/vector/vector.interface.js';
import { MATERIALS_COLLECTION } from './ingestion.worker.js';
import type { IngestionJob } from '@omnitutor/shared';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';

export class IngestionService {
  private vectors: IVectorService;

  constructor(vectors: IVectorService) {
    this.vectors = vectors;
  }

  public async getJobStatus(jobId: string, userId: string): Promise<IngestionJob> {
    const job = await IngestionJobModel.findById(jobId);
    if (!job) {
      throw new NotFoundError('Ingestion job not found');
    }

    if (job.userId.toString() !== userId) {
      throw new ForbiddenError('You do not have access to this ingestion job');
    }

    return job.toResponse();
  }

  public async getCourseIngestionStatus(
    courseId: string,
    userId: string
  ): Promise<IngestionJob[]> {
    const course = await CourseModel.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }
    if (course.owner.toString() !== userId) {
      throw new ForbiddenError('You do not have access to this course');
    }

    const jobs = await IngestionJobModel.find({ courseId }).sort({ createdAt: -1 });
    return jobs.map((j) => j.toResponse());
  }

  public async getMaterialPreview(
    courseId: string,
    materialId: string,
    userId: string
  ): Promise<{
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
  }> {
    const course = await CourseModel.findById(courseId);
    if (!course || course.owner.toString() !== userId) {
      throw new ForbiddenError('You do not have permission to view this material preview');
    }

    const material = await MaterialModel.findOne({ _id: materialId, courseId });
    if (!material) {
      throw new NotFoundError('Material not found');
    }

    // Search Qdrant points with zero vector or dummy search with materialId filter
    const searchResults = await this.vectors.search(
      MATERIALS_COLLECTION,
      new Array(768).fill(0),
      50,
      { materialId }
    );

    const chunks = searchResults.map((pt) => {
      const payload = pt.payload as any;
      return {
        id: pt.id.toString(),
        heading: payload.heading,
        page: payload.page,
        slide: payload.slide,
        timeRange: payload.timeRange,
        text: payload.text || '',
        chunkIndex: payload.chunkIndex || 0,
      };
    });

    // Sort by chunkIndex
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    return {
      materialTitle: material.originalName,
      sourceType: material.sourceType,
      totalChunks: chunks.length,
      chunks,
    };
  }
}
