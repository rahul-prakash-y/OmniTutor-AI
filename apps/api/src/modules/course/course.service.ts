import { CourseModel, type CourseDocument } from '../../database/models/course.model.js';
import { MaterialModel } from '../../database/models/material.model.js';
import { IngestionJobModel } from '../../database/models/ingestion-job.model.js';
import type { IStorageService } from '../../services/storage/storage.interface.js';
import type { IVectorService } from '../../services/vector/vector.interface.js';
import { MATERIALS_COLLECTION } from '../ingestion/ingestion.worker.js';
import type {
  Course,
  CreateCourseInput,
  UpdateCourseInput,
  CourseFilterQuery,
} from '@omnitutor/shared';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';

export class CourseService {
  private storage: IStorageService;
  private vectors: IVectorService;

  constructor(storage: IStorageService, vectors: IVectorService) {
    this.storage = storage;
    this.vectors = vectors;
  }

  public async getCourseDocument(courseId: string, userId: string): Promise<CourseDocument> {
    const course = await CourseModel.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (course.owner.toString() !== userId) {
      throw new ForbiddenError('You do not have permission to access this course');
    }

    return course;
  }

  public async createCourse(userId: string, input: CreateCourseInput): Promise<Course> {
    const course = new CourseModel({
      ...input,
      owner: userId,
      status: 'active',
      processingStatus: 'idle',
      materialCount: 0,
      indexedChunkCount: 0,
      isArchived: false,
    });

    await course.save();
    return course.toResponse();
  }

  public async getCourses(
    userId: string,
    filter: CourseFilterQuery
  ): Promise<{ courses: Course[]; total: number; page: number; limit: number }> {
    const query: Record<string, unknown> = {
      owner: userId,
    };

    if (filter.status === 'active') {
      query.isArchived = false;
    } else if (filter.status === 'archived') {
      query.isArchived = true;
    }

    if (filter.subject) {
      query.subject = { $regex: new RegExp(`^${filter.subject}$`, 'i') };
    }

    if (filter.academicLevel) {
      query.academicLevel = filter.academicLevel;
    }

    if (filter.search) {
      const searchRegex = new RegExp(filter.search, 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }, { tags: searchRegex }];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      CourseModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CourseModel.countDocuments(query),
    ]);

    return {
      courses: courses.map((c) => c.toResponse()),
      total,
      page,
      limit,
    };
  }

  public async getCourseById(courseId: string, userId: string): Promise<Course> {
    const course = await this.getCourseDocument(courseId, userId);
    return course.toResponse();
  }

  public async updateCourse(
    courseId: string,
    userId: string,
    input: UpdateCourseInput
  ): Promise<Course> {
    const course = await this.getCourseDocument(courseId, userId);

    if (input.title !== undefined) course.title = input.title;
    if (input.description !== undefined) course.description = input.description;
    if (input.subject !== undefined) course.subject = input.subject;
    if (input.academicLevel !== undefined) course.academicLevel = input.academicLevel;
    if (input.tags !== undefined) course.tags = input.tags;
    if (input.status !== undefined) course.status = input.status;
    if (input.isArchived !== undefined) {
      course.isArchived = input.isArchived;
      course.status = input.isArchived ? 'archived' : 'active';
    }

    await course.save();
    return course.toResponse();
  }

  public async archiveCourse(
    courseId: string,
    userId: string,
    archive: boolean
  ): Promise<Course> {
    const course = await this.getCourseDocument(courseId, userId);
    course.isArchived = archive;
    course.status = archive ? 'archived' : 'active';
    await course.save();
    return course.toResponse();
  }

  public async deleteCourse(courseId: string, userId: string): Promise<void> {
    const course = await this.getCourseDocument(courseId, userId);

    // 1. Delete materials and associated files in storage
    const materials = await MaterialModel.find({ courseId: course._id });
    for (const mat of materials) {
      await this.storage.delete(mat.storageKey);
    }
    await MaterialModel.deleteMany({ courseId: course._id });

    // 2. Delete ingestion jobs
    await IngestionJobModel.deleteMany({ courseId: course._id });

    // 3. Delete Qdrant vectors for this course
    await this.vectors.deletePointsByFilter(MATERIALS_COLLECTION, {
      courseId: course._id.toString(),
    });

    // 4. Delete course document
    await CourseModel.findByIdAndDelete(course._id);
  }
}
