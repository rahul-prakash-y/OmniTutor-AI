import type { SourceType } from '@omnitutor/shared';
import type { ExtractionResult, ExtractionSection, IPipelineAdapter } from './adapter.interface.js';

export class TextAdapter implements IPipelineAdapter {
  public readonly adapterName = 'text-adapter';

  public supports(sourceType: SourceType): boolean {
    return sourceType === 'txt' || sourceType === 'md';
  }

  public async extract(buffer: Buffer, _originalFilename: string): Promise<ExtractionResult> {
    const fullText = buffer.toString('utf8');
    const lines = fullText.split('\n');

    const sections: ExtractionSection[] = [];
    let currentHeading = 'Notes';
    let currentLines: string[] = [];
    let totalHeadings = 0;

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const headingMatch = line.match(/^#{1,4}\s+(.+)$/);

      if (headingMatch && headingMatch[1]) {
        if (currentLines.length > 0) {
          sections.push({
            title: currentHeading,
            content: currentLines.join('\n').trim(),
          });
          currentLines = [];
        }
        currentHeading = headingMatch[1].trim();
        totalHeadings++;
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      sections.push({
        title: currentHeading,
        content: currentLines.join('\n').trim(),
      });
    }

    const words = fullText.split(/\s+/).filter(Boolean);

    return {
      fullText,
      sections,
      metadata: {
        wordCount: words.length,
        extractedHeadingCount: totalHeadings,
        ocrApplied: false,
        hasVisuals: false,
      },
    };
  }
}
