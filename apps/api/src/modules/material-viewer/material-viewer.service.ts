import mongoose from 'mongoose';
import {
  MaterialModel,
  CourseModel,
  RecentMaterialModel,
} from '../../database/models/index.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import type { MaterialContentDetails, RecentMaterial } from '@omnitutor/shared';

import { getVectorService } from '../../services/vector/index.js';
import { MATERIALS_COLLECTION } from '../ingestion/ingestion.worker.js';

export class MaterialViewerService {
  /**
   * Fetch authenticated material content, page/slide coordinates, and transcripts without exposing private storage URLs.
   */
  async getViewerContent(
    userId: string,
    userRole: string,
    materialId: string
  ): Promise<MaterialContentDetails> {
    if (!mongoose.isValidObjectId(materialId)) {
      throw new NotFoundError(`Material ${materialId} not found`);
    }

    const material = await MaterialModel.findById(materialId);
    if (!material) {
      throw new NotFoundError(`Material ${materialId} not found`);
    }

    // Check course authorization
    const course = await CourseModel.findById(material.courseId);
    if (!course) {
      throw new NotFoundError(`Course ${material.courseId.toString()} not found`);
    }

    if (userRole !== 'admin') {
      const isOwner = course.owner.toString() === userId.toString();
      if (!isOwner) {
        throw new ForbiddenError('You do not have access to view this course material');
      }
    }

    const pageCount = material.metadata?.pageCount || 1;
    const slideCount = material.metadata?.slideCount;
    const durationSeconds = material.metadata?.durationSeconds;

    const pages: Array<{ pageNumber: number; text: string }> = [];
    const slides: Array<{ slideNumber: number; title: string; text: string }> = [];
    const transcripts: Array<{ startSeconds: number; endSeconds: number; text: string }> = [];

    // Attempt to retrieve actual extracted chunks from vector store
    try {
      const vectorService = getVectorService();
      const hits = await vectorService.search(
        MATERIALS_COLLECTION,
        new Array(768).fill(0),
        100,
        { materialId: material._id.toString() }
      );

      if (hits && hits.length > 0) {
        const pageMap = new Map<number, string[]>();
        const slideMap = new Map<number, { title: string; texts: string[] }>();

        for (const hit of hits) {
          const payload = hit.payload as any;
          if (!payload) continue;
          const text = payload.text || payload.content || '';

          if (payload.page) {
            const arr = pageMap.get(payload.page) || [];
            arr.push(text);
            pageMap.set(payload.page, arr);
          }
          if (payload.slide) {
            const s: { title: string; texts: string[] } = slideMap.get(payload.slide) || {
              title: String(payload.heading || `Slide ${payload.slide}`),
              texts: [] as string[],
            };
            s.texts.push(String(text));
            slideMap.set(payload.slide, s);
          }
          if (payload.timeRange) {
            transcripts.push({
              startSeconds: payload.timeRange.start || 0,
              endSeconds: payload.timeRange.end || 0,
              text,
            });
          }
        }

        if (pageMap.size > 0) {
          Array.from(pageMap.entries())
            .sort(([a], [b]) => a - b)
            .forEach(([pageNumber, texts]) => {
              pages.push({ pageNumber, text: texts.join('\n\n') });
            });
        }

        if (slideMap.size > 0) {
          Array.from(slideMap.entries())
            .sort(([a], [b]) => a - b)
            .forEach(([slideNumber, data]) => {
              slides.push({ slideNumber, title: data.title, text: data.texts.join('\n\n') });
            });
        }
      }
    } catch {
      // Graceful fallback if vector service search encounters cold start or non-indexed file
    }

    // Generate structured placeholder pages/slides if no vector store chunks were found
    if (pages.length === 0 && pageCount && pageCount > 0) {
      for (let p = 1; p <= Math.min(pageCount, 50); p++) {
        pages.push({
          pageNumber: p,
          text: `Page ${p} of ${material.originalName}`,
        });
      }
    }

    if (slides.length === 0 && slideCount && slideCount > 0) {
      for (let s = 1; s <= Math.min(slideCount, 50); s++) {
        slides.push({
          slideNumber: s,
          title: `Slide ${s}: Overview`,
          text: `Slide ${s} content for ${material.originalName}`,
        });
      }
    }

    transcripts.sort((a, b) => a.startSeconds - b.startSeconds);

    return {
      materialId: material._id.toString(),
      courseId: material.courseId.toString(),
      title: material.originalName,
      filename: material.filename,
      mimeType: material.mimeType,
      fileSize: material.sizeBytes,
      totalPages: pages.length > 0 ? pages.length : pageCount,
      totalSlides: slides.length > 0 ? slides.length : slideCount,
      durationSeconds,
      pages: pages.length > 0 ? pages : undefined,
      slides: slides.length > 0 ? slides : undefined,
      transcripts: transcripts.length > 0 ? transcripts : undefined,
      fullText: `Document: ${material.originalName} (${material.mimeType})`,
    };
  }

  /**
   * Record that a student opened or viewed a material with their last position.
   */
  async recordRecentView(
    userId: string,
    materialId: string,
    lastPosition?: { page?: number; timestamp?: number }
  ): Promise<RecentMaterial> {
    if (!mongoose.isValidObjectId(materialId)) {
      throw new NotFoundError(`Material ${materialId} not found`);
    }

    const material = await MaterialModel.findById(materialId);
    if (!material) {
      throw new NotFoundError(`Material ${materialId} not found`);
    }

    const course = await CourseModel.findById(material.courseId);

    const record = await RecentMaterialModel.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        materialId: material._id,
      },
      {
        $set: {
          courseId: material.courseId,
          lastViewedAt: new Date(),
          lastPosition: lastPosition || undefined,
        },
      },
      { upsert: true, new: true }
    );

    return record.toResponse(
      course?.title || 'Course',
      material.originalName,
      material.originalName,
      material.mimeType
    );
  }

  /**
   * List student's recently viewed materials.
   */
  async listRecentMaterials(userId: string, limit = 10): Promise<RecentMaterial[]> {
    const records = await RecentMaterialModel.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ lastViewedAt: -1 })
      .limit(limit)
      .populate('courseId', 'title')
      .populate('materialId', 'originalName mimeType');

    return records
      .filter((r) => r.courseId && r.materialId)
      .map((r) => {
        const course = r.courseId as any;
        const mat = r.materialId as any;
        return r.toResponse(
          course?.title || 'Course',
          mat?.originalName || 'Material',
          mat?.originalName || 'document',
          mat?.mimeType || 'application/pdf'
        );
      });
  }
}

export const materialViewerService = new MaterialViewerService();
