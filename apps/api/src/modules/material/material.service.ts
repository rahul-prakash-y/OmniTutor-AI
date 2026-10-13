import { CourseModel } from '../../database/models/course.model.js';
import { MaterialModel } from '../../database/models/material.model.js';
import { IngestionJobModel } from '../../database/models/ingestion-job.model.js';
import type { IStorageService } from '../../services/storage/storage.interface.js';
import type { IVectorService } from '../../services/vector/vector.interface.js';
import type { IngestionQueueService } from '../ingestion/queue.service.js';
import { verifyFileSignatureAndLimits } from '../../utils/file-security.js';
import { MATERIALS_COLLECTION } from '../ingestion/ingestion.worker.js';
import type { IngestionJob, Material } from '@omnitutor/shared';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';

export class MaterialService {
  private storage: IStorageService;
  private vectors: IVectorService;
  private queue: IngestionQueueService;

  constructor(
    storage: IStorageService,
    vectors: IVectorService,
    queue: IngestionQueueService
  ) {
    this.storage = storage;
    this.vectors = vectors;
    this.queue = queue;
  }

  private async verifyCourseOwnership(courseId: string, userId: string) {
    const course = await CourseModel.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }
    if (course.owner.toString() !== userId) {
      throw new ForbiddenError('You do not have permission to manage materials for this course');
    }
    return course;
  }

  public async uploadMaterial(params: {
    courseId: string;
    userId: string;
    originalFilename: string;
    buffer: Buffer;
    declaredMimeType?: string;
  }): Promise<{ material: Material; job: IngestionJob }> {
    const { courseId, userId, originalFilename, buffer, declaredMimeType } = params;

    // 1. Verify authenticated user ownership of course
    const course = await this.verifyCourseOwnership(courseId, userId);

    // 2. Validate file signature, magic bytes, archive integrity, and size limits
    const validation = verifyFileSignatureAndLimits(buffer, originalFilename, declaredMimeType);

    // 3. Save buffer to storage provider using safe server-side storageKey
    await this.storage.save(validation.storageKey, buffer);

    // 4. Create Material document
    const material = new MaterialModel({
      courseId: course._id,
      ownerId: userId,
      filename: validation.safeFilename,
      originalName: validation.sanitizedFilename,
      mimeType: declaredMimeType || validation.detectedMimeType,
      detectedMimeType: validation.detectedMimeType,
      sizeBytes: buffer.length,
      storageKey: validation.storageKey,
      sourceType: validation.sourceType,
      status: 'queued',
      chunkCount: 0,
      metadata: {},
      retryCount: 0,
    });
    await material.save();

    // 5. Create IngestionJob document
    const job = new IngestionJobModel({
      courseId: course._id,
      materialId: material._id,
      userId,
      status: 'queued',
      stage: 'validation',
      progress: 0,
      chunksGenerated: 0,
      tokensUsed: 0,
      attempts: 0,
      maxAttempts: 3,
    });
    await job.save();

    material.currentJobId = job._id;
    await material.save();

    // Update course metadata
    course.materialCount = await MaterialModel.countDocuments({ courseId: course._id });
    course.processingStatus = 'processing';
    await course.save();

    // 6. Enqueue ingestion job
    await this.queue.enqueue(job._id.toString());

    return {
      material: material.toResponse(),
      job: job.toResponse(),
    };
  }

  public async getMaterials(courseId: string, userId: string): Promise<Material[]> {
    await this.verifyCourseOwnership(courseId, userId);
    const materials = await MaterialModel.find({ courseId }).sort({ createdAt: -1 });
    return materials.map((m) => m.toResponse());
  }

  public async getMaterialById(
    courseId: string,
    materialId: string,
    userId: string
  ): Promise<Material> {
    await this.verifyCourseOwnership(courseId, userId);
    const material = await MaterialModel.findOne({ _id: materialId, courseId });
    if (!material) {
      throw new NotFoundError('Material not found');
    }
    return material.toResponse();
  }

  public async deleteMaterial(
    courseId: string,
    materialId: string,
    userId: string
  ): Promise<void> {
    const course = await this.verifyCourseOwnership(courseId, userId);
    const material = await MaterialModel.findOne({ _id: materialId, courseId });
    if (!material) {
      throw new NotFoundError('Material not found');
    }

    // 1. Delete file in storage
    await this.storage.delete(material.storageKey);

    // 2. Delete stale points in Qdrant
    await this.vectors.deletePointsByFilter(MATERIALS_COLLECTION, {
      materialId: material._id.toString(),
    });

    // 3. Delete ingestion jobs
    await IngestionJobModel.deleteMany({ materialId: material._id });

    // 4. Delete material document
    await MaterialModel.findByIdAndDelete(material._id);

    // 5. Recalculate Course metrics
    const remainingMaterials = await MaterialModel.find({
      courseId: course._id,
      status: 'indexed',
    });
    course.materialCount = await MaterialModel.countDocuments({ courseId: course._id });
    course.indexedChunkCount = remainingMaterials.reduce((acc, m) => acc + m.chunkCount, 0);

    const hasProcessing = await MaterialModel.exists({
      courseId: course._id,
      status: { $in: ['queued', 'processing', 'uploaded'] },
    });
    course.processingStatus = hasProcessing ? 'processing' : 'idle';
    await course.save();
  }

  public async retryIngestion(
    courseId: string,
    materialId: string,
    userId: string
  ): Promise<IngestionJob> {
    const course = await this.verifyCourseOwnership(courseId, userId);
    const material = await MaterialModel.findOne({ _id: materialId, courseId });
    if (!material) {
      throw new NotFoundError('Material not found');
    }

    // Prevent duplicate in-flight ingestion jobs for the same material
    if (material.status === 'processing' || material.status === 'queued') {
      if (material.currentJobId) {
        const existingJob = await IngestionJobModel.findById(material.currentJobId);
        if (existingJob && ['queued', 'processing'].includes(existingJob.status)) {
          return existingJob.toResponse();
        }
      }
    }

    material.status = 'queued';
    material.errorMessage = undefined;
    material.retryCount += 1;

    // Create fresh IngestionJob
    const job = new IngestionJobModel({
      courseId: course._id,
      materialId: material._id,
      userId,
      status: 'queued',
      stage: 'validation',
      progress: 0,
      chunksGenerated: 0,
      tokensUsed: 0,
      attempts: 0,
      maxAttempts: 3,
    });
    await job.save();

    material.currentJobId = job._id;
    await material.save();

    course.processingStatus = 'processing';
    await course.save();

    await this.queue.enqueue(job._id.toString());
    return job.toResponse();
  }
}
