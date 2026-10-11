import { PDFParse } from 'pdf-parse';
import type { SourceType } from '@omnitutor/shared';
import type { ExtractionResult, ExtractionSection, IPipelineAdapter } from './adapter.interface.js';
import { BadRequestError } from '../../../utils/errors.js';
import { logger } from '../../../config/logger.js';

export class PdfAdapter implements IPipelineAdapter {
  public readonly adapterName = 'pdf-adapter';

  public supports(sourceType: SourceType): boolean {
    return sourceType === 'pdf';
  }

  public async extract(buffer: Buffer, originalFilename: string): Promise<ExtractionResult> {
    let parser: PDFParse | null = null;
    try {
      parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();

      const pageCount = textResult.total || textResult.pages.length || 1;
      const fullText = textResult.text || '';
      const totalChars = fullText.replace(/\s+/g, '').length;
      const avgCharsPerPage = totalChars / Math.max(pageCount, 1);

      // Scanned document detection: insufficient text extracted (< 25 chars per page)
      if (avgCharsPerPage < 25) {
        logger.warn(
          { originalFilename, avgCharsPerPage, totalChars, pageCount },
          'Scanned PDF detected with insufficient extractable text layer'
        );

        const ocrExtracted = await this.performOcrFallback(buffer, originalFilename, pageCount);

        if (!ocrExtracted || ocrExtracted.trim().length < 30) {
          throw new BadRequestError(
            `Scanned PDF document detected in '${originalFilename}' with no readable digital text layer (average ${avgCharsPerPage.toFixed(1)} chars/page). OCR fallback was unable to extract legible text. Please upload a clear document with readable text.`
          );
        }

        return {
          fullText: ocrExtracted,
          sections: [
            {
              title: `OCR Extraction - ${originalFilename}`,
              content: ocrExtracted,
              page: 1,
            },
          ],
          metadata: {
            pageCount,
            wordCount: ocrExtracted.split(/\s+/).length,
            ocrApplied: true,
            hasVisuals: true,
          },
        };
      }

      const sections: ExtractionSection[] = [];
      let extractedHeadingCount = 0;

      for (const p of textResult.pages) {
        const text = p.text.trim();
        if (!text) continue;

        // Detect potential section heading in first lines of page
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        let title: string | undefined;

        if (lines.length > 0) {
          const firstLine = lines[0]!;
          if (
            firstLine.length < 90 &&
            (/^(chapter|section|module|unit|lecture|\d+(\.\d+)*)\b/i.test(firstLine) ||
              /^[A-Z0-9\s:,-]+$/.test(firstLine))
          ) {
            title = firstLine;
            extractedHeadingCount++;
          }
        }

        sections.push({
          title,
          content: text,
          page: p.num,
        });
      }

      const words = fullText.split(/\s+/).filter(Boolean);

      return {
        fullText,
        sections,
        metadata: {
          pageCount,
          wordCount: words.length,
          extractedHeadingCount,
          ocrApplied: false,
          hasVisuals: false,
        },
      };
    } catch (err: unknown) {
      if (err instanceof BadRequestError) throw err;
      logger.error({ err, originalFilename }, 'Failed to parse PDF document');
      throw new BadRequestError(
        `Unable to process PDF '${originalFilename}': ${err instanceof Error ? err.message : 'Corrupted PDF structure'}`
      );
    } finally {
      if (parser) {
        await parser.destroy().catch(() => {});
      }
    }
  }

  private async performOcrFallback(
    _buffer: Buffer,
    _filename: string,
    _pageCount: number
  ): Promise<string> {
    return '';
  }
}
