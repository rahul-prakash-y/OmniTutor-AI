import crypto from 'node:crypto';
import type { ChunkProvenance, MaterialChunk, SourceType } from '@omnitutor/shared';
import type { ExtractionSection } from './adapters/adapter.interface.js';

export interface ChunkingOptions {
  maxChunkChars?: number;
  overlapChars?: number;
}

export class ChunkingService {
  private readonly maxChunkChars: number;
  private readonly overlapChars: number;

  constructor(options?: ChunkingOptions) {
    this.maxChunkChars = options?.maxChunkChars ?? 1800; // ~450 tokens
    this.overlapChars = options?.overlapChars ?? 200; // ~50 tokens
  }

  /**
   * Normalize whitespace while preserving markdown structure and line breaks
   */
  public normalizeWhitespace(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Generate stable deterministic UUID from string seed
   */
  public generateDeterministicUuid(seed: string): string {
    const md5 = crypto.createHash('md5').update(seed).digest('hex');
    // Format into standard 8-4-4-4-12 UUID format
    return [
      md5.slice(0, 8),
      md5.slice(8, 12),
      '4' + md5.slice(13, 16), // version 4
      ((parseInt(md5.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + md5.slice(18, 20), // variant 1
      md5.slice(20, 32),
    ].join('-');
  }

  /**
   * Split sections into traceable chunks with full provenance
   */
  public createChunks(params: {
    courseId: string;
    materialId: string;
    originalFilename: string;
    sourceType: SourceType;
    sections: ExtractionSection[];
  }): MaterialChunk[] {
    const { courseId, materialId, originalFilename, sourceType, sections } = params;
    const chunks: MaterialChunk[] = [];
    let globalChunkIndex = 0;

    for (const section of sections) {
      const normalizedContent = this.normalizeWhitespace(section.content);
      if (!normalizedContent) continue;

      const rawPieces = this.splitIntoPieces(normalizedContent, this.maxChunkChars, this.overlapChars);

      for (const piece of rawPieces) {
        if (!piece.trim()) continue;

        const contentHash = crypto.createHash('sha256').update(piece).digest('hex');
        const tokenCount = Math.max(1, Math.ceil(piece.length / 4));
        const stableId = this.generateDeterministicUuid(
          `${courseId}_${materialId}_${globalChunkIndex}_${contentHash.slice(0, 16)}`
        );

        const provenance: ChunkProvenance = {
          courseId,
          materialId,
          originalFilename,
          sourceType,
          page: section.page,
          slide: section.slide,
          timeRange: section.timeRange,
          heading: section.title,
          chunkIndex: globalChunkIndex,
          contentHash,
          tokenCount,
        };

        chunks.push({
          id: stableId,
          text: piece,
          metadata: provenance,
        });

        globalChunkIndex++;
      }
    }

    return chunks;
  }

  private splitIntoPieces(text: string, maxLen: number, overlap: number): string[] {
    if (text.length <= maxLen) {
      return [text];
    }

    const pieces: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + maxLen;

      if (end >= text.length) {
        pieces.push(text.slice(start).trim());
        break;
      }

      // Try finding boundary: paragraph break, line break, or sentence period
      const searchWindow = text.slice(start, end);
      let breakPoint = searchWindow.lastIndexOf('\n\n');

      if (breakPoint === -1 || breakPoint < maxLen * 0.4) {
        breakPoint = searchWindow.lastIndexOf('\n');
      }
      if (breakPoint === -1 || breakPoint < maxLen * 0.4) {
        breakPoint = searchWindow.lastIndexOf('. ');
        if (breakPoint !== -1) breakPoint += 1;
      }
      if (breakPoint === -1 || breakPoint < maxLen * 0.4) {
        breakPoint = searchWindow.lastIndexOf(' ');
      }
      if (breakPoint === -1 || breakPoint < maxLen * 0.2) {
        breakPoint = maxLen;
      }

      const chunk = text.slice(start, start + breakPoint).trim();
      if (chunk) {
        pieces.push(chunk);
      }

      start = start + breakPoint - overlap;
      if (start <= 0 || start >= text.length) break;
    }

    return pieces;
  }
}
