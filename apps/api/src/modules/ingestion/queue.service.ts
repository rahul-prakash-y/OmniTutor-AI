import { EventEmitter } from 'node:events';
import { IngestionJobModel } from '../../database/models/ingestion-job.model.js';
import { logger } from '../../config/logger.js';
import type { IngestionJob } from '@omnitutor/shared';

export interface IQueueService {
  enqueue(jobId: string): Promise<void>;
  cancel(jobId: string): Promise<boolean>;
  start(): void;
  stop(): Promise<void>;
  onJobUpdate(callback: (job: IngestionJob) => void): void;
}

export type JobProcessor = (jobId: string) => Promise<void>;

export class IngestionQueueService extends EventEmitter implements IQueueService {
  private queue: string[] = [];
  private activeJobs = new Set<string>();
  private concurrency: number;
  private processor: JobProcessor | null = null;
  private isRunning = false;

  constructor(concurrency = 2) {
    super();
    this.concurrency = concurrency;
  }

  public setProcessor(processor: JobProcessor): void {
    this.processor = processor;
  }

  public start(): void {
    this.isRunning = true;
    logger.info(`IngestionQueueService started (concurrency: ${this.concurrency})`);
    this.processNext();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    this.queue = [];
    logger.info('IngestionQueueService stopped');
  }

  public async enqueue(jobId: string): Promise<void> {
    if (this.queue.includes(jobId) || this.activeJobs.has(jobId)) {
      logger.warn({ jobId }, 'Job is already enqueued or running; skipping duplicate enqueue');
      return;
    }

    this.queue.push(jobId);
    logger.info({ jobId, queueLength: this.queue.length }, 'Job added to ingestion queue');

    if (this.isRunning) {
      this.processNext();
    }
  }

  public async cancel(jobId: string): Promise<boolean> {
    const queueIdx = this.queue.indexOf(jobId);
    if (queueIdx !== -1) {
      this.queue.splice(queueIdx, 1);
      await IngestionJobModel.findByIdAndUpdate(jobId, {
        status: 'cancelled',
        stage: 'failed',
        error: 'Job cancelled by user before processing started',
      });
      return true;
    }
    return false;
  }

  public onJobUpdate(callback: (job: IngestionJob) => void): void {
    this.on('job:update', callback);
  }

  public emitJobUpdate(job: IngestionJob): void {
    this.emit('job:update', job);
  }

  private async processNext(): Promise<void> {
    if (!this.isRunning || !this.processor) return;
    if (this.activeJobs.size >= this.concurrency || this.queue.length === 0) return;

    const jobId = this.queue.shift();
    if (!jobId) return;

    this.activeJobs.add(jobId);

    // Process asynchronously without blocking loop
    (async () => {
      try {
        await this.processor!(jobId);
      } catch (err) {
        logger.error({ err, jobId }, 'Unhandled exception during job processing in queue');
      } finally {
        this.activeJobs.delete(jobId);
        // Continue processing remaining queue
        this.processNext();
      }
    })();

    // Fill up to concurrency limit
    if (this.activeJobs.size < this.concurrency && this.queue.length > 0) {
      this.processNext();
    }
  }
}
