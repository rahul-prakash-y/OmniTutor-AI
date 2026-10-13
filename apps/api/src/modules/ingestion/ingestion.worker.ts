import { CourseModel } from '../../database/models/course.model.js';
import { MaterialModel } from '../../database/models/material.model.js';
import { IngestionJobModel } from '../../database/models/ingestion-job.model.js';
import type { IStorageService } from '../../services/storage/storage.interface.js';
import type { IEmbeddingProvider } from '../../services/embedding/embedding.interface.js';
import type { IVectorService } from '../../services/vector/vector.interface.js';
import { AdapterRegistry } from './adapters/index.js';
import { ChunkingService } from './chunking.service.js';
import type { IngestionQueueService } from './queue.service.js';
import { logger } from '../../config/logger.js';
import { NotFoundError } from '../../utils/errors.js';

export const MATERIALS_COLLECTION = 'omnitutor_materials';

export class IngestionWorker {
  private storage: IStorageService;
  private adapters: AdapterRegistry;
  private chunking: ChunkingService;
  private embeddings: IEmbeddingProvider;
  private vectors: IVectorService;
  private queue: IngestionQueueService;

  constructor(deps: {
    storage: IStorageService;
    adapters?: AdapterRegistry;
    chunking?: ChunkingService;
    embeddings: IEmbeddingProvider;
    vectors: IVectorService;
    queue: IngestionQueueService;
    geminiApiKey?: string;
  }) {
    this.storage = deps.storage;
    this.adapters = deps.adapters || new AdapterRegistry(deps.geminiApiKey);
    this.chunking = deps.chunking || new ChunkingService();
    this.embeddings = deps.embeddings;
    this.vectors = deps.vectors;
    this.queue = deps.queue;

    // Register self as processor
    this.queue.setProcessor((jobId) => this.processJob(jobId));
  }

  public async processJob(jobId: string): Promise<void> {
    const job = await IngestionJobModel.findById(jobId);
    if (!job) {
      logger.error({ jobId }, 'Ingestion job not found');
      return;
    }

    const material = await MaterialModel.findById(job.materialId);
    if (!material) {
      logger.error({ jobId, materialId: job.materialId }, 'Material not found for ingestion job');
      await this.markJobFailed(job, 'Material document not found');
      return;
    }

    const course = await CourseModel.findById(job.courseId);
    if (!course) {
      logger.error({ jobId, courseId: job.courseId }, 'Course not found for ingestion job');
      await this.markJobFailed(job, 'Course document not found');
      return;
    }

    try {
      // 1. Stage: Validation
      await this.updateJobStage(job, 'validation', 10);
      material.status = 'processing';
      material.errorMessage = undefined;
      await material.save();

      course.processingStatus = 'processing';
      await course.save();

      const fileExists = await this.storage.exists(material.storageKey);
      if (!fileExists) {
        throw new NotFoundError(`Material file not found in storage: ${material.storageKey}`);
      }

      // 2. Stage: Extraction
      await this.updateJobStage(job, 'extraction', 30);
      const buffer = await this.storage.read(material.storageKey);

      const adapter = this.adapters.getAdapter(material.sourceType);
      if (!adapter) {
        throw new Error(`No processing adapter found for source type: ${material.sourceType}`);
      }

      // Execute extraction with 60-second execution safety timeout
      const extractionPromise = adapter.extract(buffer, material.originalName);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Extraction timed out after 60 seconds')), 60000)
      );
      const extraction = await Promise.race([extractionPromise, timeoutPromise]);

      // Update material metadata with extracted metrics
      material.metadata = {
        ...material.metadata,
        ...extraction.metadata,
      };
      await material.save();

      // 3. Stage: Chunking
      await this.updateJobStage(job, 'chunking', 50);
      const chunks = this.chunking.createChunks({
        courseId: course._id.toString(),
        materialId: material._id.toString(),
        originalFilename: material.originalName,
        sourceType: material.sourceType,
        sections: extraction.sections,
      });

      if (chunks.length === 0) {
        throw new Error('Extraction produced zero valid content chunks. Document may be empty or unreadable.');
      }

      // 4. Stage: Embedding Generation
      await this.updateJobStage(job, 'embedding', 70);
      const chunkTexts = chunks.map((c) => c.text);
      const embeddings = await this.embeddings.generateEmbeddings(chunkTexts);

      // 5. Stage: Vector Upsert to Qdrant with Cross-System Consistency
      await this.updateJobStage(job, 'vector_upsert', 85);
      await this.vectors.createCollectionIfNotExists(
        MATERIALS_COLLECTION,
        this.embeddings.dimensions
      );

      // Delete stale vectors for this material before upserting new ones
      await this.vectors.deletePointsByFilter(MATERIALS_COLLECTION, {
        materialId: material._id.toString(),
      });

      const vectorPoints = chunks.map((chunk, idx) => ({
        id: chunk.id,
        vector: embeddings[idx]!,
        payload: {
          courseId: chunk.metadata.courseId,
          materialId: chunk.metadata.materialId,
          ownerId: material.ownerId.toString(),
          originalFilename: chunk.metadata.originalFilename,
          sourceType: chunk.metadata.sourceType,
          page: chunk.metadata.page,
          slide: chunk.metadata.slide,
          timeRange: chunk.metadata.timeRange,
          heading: chunk.metadata.heading,
          chunkIndex: chunk.metadata.chunkIndex,
          contentHash: chunk.metadata.contentHash,
          tokenCount: chunk.metadata.tokenCount,
          text: chunk.text,
        },
      }));

      const upsertSuccess = await this.vectors.upsertPoints(MATERIALS_COLLECTION, vectorPoints);
      if (!upsertSuccess) {
        throw new Error('Failed to persist vector points to Qdrant storage');
      }

      // 6. Confirmed Success: Finalize statuses across MongoDB & Qdrant
      const totalTokens = chunks.reduce((acc, c) => acc + c.metadata.tokenCount, 0);

      material.status = 'indexed';
      material.chunkCount = chunks.length;
      material.errorMessage = undefined;
      await material.save();

      // Recalculate Course metrics
      const activeMaterials = await MaterialModel.find({
        courseId: course._id,
        status: 'indexed',
      });
      const totalIndexedChunks = activeMaterials.reduce((acc, m) => acc + m.chunkCount, 0);

      const hasProcessingMaterials = await MaterialModel.exists({
        courseId: course._id,
        status: { $in: ['queued', 'processing', 'uploaded'] },
      });

      course.materialCount = await MaterialModel.countDocuments({ courseId: course._id });
      course.indexedChunkCount = totalIndexedChunks;
      course.processingStatus = hasProcessingMaterials ? 'processing' : 'indexed';
      await course.save();

      // Finalize Job
      job.status = 'indexed';
      job.stage = 'completed';
      job.progress = 100;
      job.chunksGenerated = chunks.length;
      job.tokensUsed = totalTokens;
      job.completedAt = new Date();
      await job.save();

      this.queue.emitJobUpdate(job.toResponse());
      logger.info(
        { jobId: job._id, materialId: material._id, chunksCount: chunks.length },
        'Ingestion job completed successfully'
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown ingestion pipeline error';
      logger.error({ err, jobId: job._id, materialId: material._id }, 'Ingestion pipeline error');

      await this.markJobFailed(job, errorMessage, material, course);
    }
  }

  private async updateJobStage(
    job: any,
    stage: 'validation' | 'extraction' | 'chunking' | 'embedding' | 'vector_upsert',
    progress: number
  ): Promise<void> {
    job.status = 'processing';
    job.stage = stage;
    job.progress = progress;
    if (!job.startedAt) {
      job.startedAt = new Date();
    }
    await job.save();
    this.queue.emitJobUpdate(job.toResponse());
  }

  private isPermanentFailure(errorMessage: string): boolean {
    const permanentPatterns = [
      /document not found/i,
      /not found in storage/i,
      /no processing adapter found/i,
      /zero valid content chunks/i,
      /insufficient text layer/i,
      /scanned pdf/i,
      /decompression bomb/i,
      /zip slip/i,
      /invalid.*archive structure/i,
      /unrecognized file signature/i,
      /unsupported format/i,
      /binary characters or null bytes/i,
      /exceeds maximum allowed size/i,
    ];
    return permanentPatterns.some((pattern) => pattern.test(errorMessage));
  }

  private async markJobFailed(
    job: any,
    errorMessage: string,
    material?: any,
    course?: any
  ): Promise<void> {
    job.attempts += 1;
    job.error = errorMessage;

    if (material) {
      material.status = 'failed';
      material.errorMessage = errorMessage;
      await material.save();
    }

    if (course) {
      const hasProcessingMaterials = await MaterialModel.exists({
        courseId: course._id,
        status: { $in: ['queued', 'processing', 'uploaded'] },
      });
      course.processingStatus = hasProcessingMaterials ? 'processing' : 'failed';
      await course.save();
    }

    const isPermanent = this.isPermanentFailure(errorMessage);

    // Only retry transient errors; do NOT retry permanent validation failures
    if (!isPermanent && job.attempts < job.maxAttempts) {
      // Schedule bounded backoff retry (capped at 10s)
      const delayMs = Math.min(Math.pow(2, job.attempts) * 1000, 10000);
      logger.warn(
        { jobId: job._id, attempt: job.attempts, maxAttempts: job.maxAttempts, delayMs },
        'Scheduling transient error retry with bounded exponential backoff'
      );
      job.status = 'queued';
      job.stage = 'validation';
      job.progress = 0;
      await job.save();
      this.queue.emitJobUpdate(job.toResponse());

      setTimeout(() => {
        this.queue.enqueue(job._id.toString());
      }, delayMs);
    } else {
      if (isPermanent) {
        logger.info(
          { jobId: job._id, error: errorMessage },
          'Permanent validation failure detected. Skipping retry.'
        );
      }
      job.status = 'failed';
      job.stage = 'failed';
      job.completedAt = new Date();
      await job.save();
      this.queue.emitJobUpdate(job.toResponse());
    }
  }

  /**
   * Reconcile orphaned ingestion records and stale vectors after server restart
   */
  public async reconcileOrphanedJobs(): Promise<void> {
    try {
      const orphanedJobs = await IngestionJobModel.find({
        status: { $in: ['processing', 'queued'] },
      });

      for (const job of orphanedJobs) {
        logger.warn(
          { jobId: job._id, status: job.status, attempts: job.attempts },
          'Reconciling orphaned ingestion job found on startup'
        );

        if (job.attempts < job.maxAttempts) {
          job.status = 'queued';
          job.stage = 'validation';
          job.progress = 0;
          await job.save();
          await this.queue.enqueue(job._id.toString());
        } else {
          job.status = 'failed';
          job.stage = 'failed';
          job.error = 'Job interrupted by server shutdown and reached attempt limit';
          job.completedAt = new Date();
          await job.save();

          await MaterialModel.findByIdAndUpdate(job.materialId, {
            status: 'failed',
            errorMessage: job.error,
          });

          // Clean up stale Qdrant points for this failed material
          await this.vectors.deletePointsByFilter(MATERIALS_COLLECTION, {
            materialId: job.materialId.toString(),
          });
        }
      }

      // Reconcile courses stuck in processing state
      const stuckCourses = await CourseModel.find({ processingStatus: 'processing' });
      for (const course of stuckCourses) {
        const hasActiveJobs = await IngestionJobModel.exists({
          courseId: course._id,
          status: { $in: ['queued', 'processing'] },
        });

        if (!hasActiveJobs) {
          const hasIndexed = await MaterialModel.exists({
            courseId: course._id,
            status: 'indexed',
          });
          course.processingStatus = hasIndexed ? 'indexed' : 'idle';
          await course.save();
        }
      }
    } catch (err) {
      logger.warn({ err }, 'Warning during orphaned ingestion job reconciliation');
    }
  }
}
