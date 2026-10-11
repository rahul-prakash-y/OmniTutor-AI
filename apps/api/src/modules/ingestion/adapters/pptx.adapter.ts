import AdmZip from 'adm-zip';
import type { SourceType } from '@omnitutor/shared';
import type { ExtractionResult, ExtractionSection, IPipelineAdapter } from './adapter.interface.js';
import { BadRequestError } from '../../../utils/errors.js';
import { logger } from '../../../config/logger.js';

export class PptxAdapter implements IPipelineAdapter {
  public readonly adapterName = 'pptx-adapter';

  public supports(sourceType: SourceType): boolean {
    return sourceType === 'pptx';
  }

  public async extract(buffer: Buffer, originalFilename: string): Promise<ExtractionResult> {
    try {
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();

      // Find slide entries: ppt/slides/slide1.xml, ppt/slides/slide2.xml, etc.
      const slideEntries = entries.filter((e) =>
        /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName)
      );

      // Sort slides numerically: slide1, slide2, slide10, etc.
      slideEntries.sort((a, b) => {
        const numA = parseInt(a.entryName.match(/\d+/)![0], 10);
        const numB = parseInt(b.entryName.match(/\d+/)![0], 10);
        return numA - numB;
      });

      if (slideEntries.length === 0) {
        throw new BadRequestError(`No slides found in presentation '${originalFilename}'`);
      }

      const sections: ExtractionSection[] = [];
      const allTexts: string[] = [];
      let totalHeadings = 0;

      for (let i = 0; i < slideEntries.length; i++) {
        const entry = slideEntries[i]!;
        const slideNumber = i + 1;
        const xmlContent = entry.getData().toString('utf8');

        // Extract all text elements: <a:t>...</a:t>
        const textMatches = xmlContent.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
        const textPieces = textMatches.map((m) =>
          m.replace(/<\/?a:t[^>]*>/gi, '').trim()
        ).filter(Boolean);

        if (textPieces.length === 0) continue;

        // Slide title is typically the first significant text run
        const slideTitle = textPieces[0];
        if (slideTitle && slideTitle.length < 80) {
          totalHeadings++;
        }

        const slideText = textPieces.join('\n');
        allTexts.push(`--- Slide ${slideNumber}: ${slideTitle} ---\n${slideText}`);

        sections.push({
          title: slideTitle,
          content: slideText,
          slide: slideNumber,
        });
      }

      const fullText = allTexts.join('\n\n');
      const words = fullText.split(/\s+/).filter(Boolean);

      return {
        fullText,
        sections,
        metadata: {
          slideCount: slideEntries.length,
          wordCount: words.length,
          extractedHeadingCount: totalHeadings,
          ocrApplied: false,
          hasVisuals: true,
        },
      };
    } catch (err: unknown) {
      if (err instanceof BadRequestError) throw err;
      logger.error({ err, originalFilename }, 'Failed to parse PPTX presentation');
      throw new BadRequestError(
        `Unable to process PPTX presentation '${originalFilename}': ${err instanceof Error ? err.message : 'Invalid presentation archive'}`
      );
    }
  }
}
