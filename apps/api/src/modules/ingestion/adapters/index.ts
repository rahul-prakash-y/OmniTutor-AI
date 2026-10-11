import type { SourceType } from '@omnitutor/shared';
import type { IPipelineAdapter } from './adapter.interface.js';
import { PdfAdapter } from './pdf.adapter.js';
import { PptxAdapter } from './pptx.adapter.js';
import { DocxAdapter } from './docx.adapter.js';
import { TextAdapter } from './text.adapter.js';
import { MediaAdapter } from './media.adapter.js';

export * from './adapter.interface.js';
export * from './pdf.adapter.js';
export * from './pptx.adapter.js';
export * from './docx.adapter.js';
export * from './text.adapter.js';
export * from './media.adapter.js';

export class AdapterRegistry {
  private adapters: IPipelineAdapter[];

  constructor(geminiApiKey?: string) {
    this.adapters = [
      new PdfAdapter(),
      new PptxAdapter(),
      new DocxAdapter(),
      new TextAdapter(),
      new MediaAdapter(geminiApiKey),
    ];
  }

  public getAdapter(sourceType: SourceType): IPipelineAdapter | undefined {
    return this.adapters.find((a) => a.supports(sourceType));
  }
}
