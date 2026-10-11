import type { SourceType } from '@omnitutor/shared';

export interface ExtractionSection {
  title?: string;
  content: string;
  page?: number;
  slide?: number;
  timeRange?: {
    start: number;
    end: number;
  };
}

export interface ExtractionResult {
  fullText: string;
  sections: ExtractionSection[];
  metadata: {
    pageCount?: number;
    slideCount?: number;
    durationSeconds?: number;
    wordCount?: number;
    extractedHeadingCount?: number;
    ocrApplied?: boolean;
    hasVisuals?: boolean;
    language?: string;
  };
}

export interface IPipelineAdapter {
  readonly adapterName: string;
  supports(sourceType: SourceType): boolean;
  extract(buffer: Buffer, originalFilename: string): Promise<ExtractionResult>;
}
