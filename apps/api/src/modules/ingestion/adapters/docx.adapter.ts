import AdmZip from 'adm-zip';
import type { SourceType } from '@omnitutor/shared';
import type { ExtractionResult, ExtractionSection, IPipelineAdapter } from './adapter.interface.js';
import { BadRequestError } from '../../../utils/errors.js';
import { logger } from '../../../config/logger.js';

export class DocxAdapter implements IPipelineAdapter {
  public readonly adapterName = 'docx-adapter';

  public supports(sourceType: SourceType): boolean {
    return sourceType === 'docx';
  }

  public async extract(buffer: Buffer, originalFilename: string): Promise<ExtractionResult> {
    try {
      const zip = new AdmZip(buffer);
      const documentEntry = zip.getEntry('word/document.xml');

      if (!documentEntry) {
        throw new BadRequestError(`Missing document.xml in DOCX file '${originalFilename}'`);
      }

      const xml = documentEntry.getData().toString('utf8');

      // Match paragraphs: <w:p>...</w:p>
      const paragraphMatches = xml.match(/<w:p[\s>].*?<\/w:p>/gi) || [];

      const sections: ExtractionSection[] = [];
      let currentHeading = 'Introduction';
      let currentParagraphs: string[] = [];
      let totalHeadings = 0;
      let totalWords = 0;

      for (const pXml of paragraphMatches) {
        // Extract text runs: <w:t>...</w:t>
        const textMatches = pXml.match(/<w:t[^>]*>(.*?)<\/w:t>/gi) || [];
        const text = textMatches
          .map((m) => m.replace(/<\/?w:t[^>]*>/gi, ''))
          .join('')
          .trim();

        if (!text) continue;

        // Check if paragraph is marked as Heading
        const isHeading =
          /<w:pStyle\s+w:val="Heading/i.test(pXml) ||
          /<w:pStyle\s+w:val="Title/i.test(pXml) ||
          (/^[A-Z0-9\s:.-]{3,60}$/.test(text) && text.length < 60);

        if (isHeading && currentParagraphs.length > 0) {
          // Commit previous section
          const content = currentParagraphs.join('\n\n');
          sections.push({
            title: currentHeading,
            content,
          });
          currentParagraphs = [];
          currentHeading = text;
          totalHeadings++;
        } else if (isHeading) {
          currentHeading = text;
          totalHeadings++;
        } else {
          currentParagraphs.push(text);
          totalWords += text.split(/\s+/).filter(Boolean).length;
        }
      }

      if (currentParagraphs.length > 0) {
        sections.push({
          title: currentHeading,
          content: currentParagraphs.join('\n\n'),
        });
      }

      const fullText = sections
        .map((s) => (s.title ? `## ${s.title}\n\n${s.content}` : s.content))
        .join('\n\n');

      return {
        fullText,
        sections,
        metadata: {
          wordCount: totalWords,
          extractedHeadingCount: totalHeadings,
          ocrApplied: false,
          hasVisuals: false,
        },
      };
    } catch (err: unknown) {
      if (err instanceof BadRequestError) throw err;
      logger.error({ err, originalFilename }, 'Failed to parse DOCX document');
      throw new BadRequestError(
        `Unable to process DOCX file '${originalFilename}': ${err instanceof Error ? err.message : 'Invalid document'}`
      );
    }
  }
}
