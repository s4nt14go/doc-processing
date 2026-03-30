import { IProcessRepo } from '../../repos/IProcessRepo.ts';
import { logger } from '../../../../shared/infra/logger/Logger.ts';
import { PROCESS_STATUS } from '../../domain/ProcessStatus.ts';
import { ISummarizer } from '../../services/ISummarizer.ts';

const { APP_STAGE, TEST_WORKER_DELAY_SECONDS, TEST_WORKER_FORCE_FAILURE } = process.env;
if (!APP_STAGE)
  throw new Error('APP_STAGE environment variable is required but not defined.');

export interface WorkerRequestDto {
  processId: string;
}

/**
 * Processes files within a batch.
 */
export class Worker {
  private readonly _processRepo: IProcessRepo;
  private readonly _summarizer: ISummarizer;

  constructor(dependencies: {
    processRepo: IProcessRepo;
    summarizer: ISummarizer;
  }) {
    this._processRepo = dependencies.processRepo;
    this._summarizer = dependencies.summarizer;
  }

  public async execute(request: WorkerRequestDto): Promise<void> {
    const { processId } = request;

    logger.info('Worker: Starting execution for process.', { processId });

    const process = await this._processRepo.findById(processId);
    if (!process) {
      throw new Error(`Process with id ${processId} not found`);
    }

    try {
      process.start();
      const myStartedAt = process.startedAt!.getTime();
      await this._processRepo.save(process);

      const filenames = process.filenamesToProcess;
      
      const globalWordFrequencies = new Map<string, number>();
      let totalWords = 0;
      let totalLines = 0;
      const processedFilenames: string[] = [];
      const fileSummaries: Record<string, string> = {};

      for (const filename of filenames) {
        // Re-fetch to check if status was changed (STOPPED) or if another worker is competing
        const dbProcess = await this._processRepo.findById(processId);
        
        if (!dbProcess || dbProcess.status !== PROCESS_STATUS.RUNNING) {
          logger.info('Worker: Process no longer RUNNING. Aborting.', { 
            processId, 
            status: dbProcess?.status 
          });
          return;
        }

        // If someone else started earlier than me, I am a redundant duplicate. Avoid race conditions.
        if (dbProcess.startedAt && dbProcess.startedAt.getTime() < myStartedAt) {
          logger.info('Worker: An earlier instance is already processing. Aborting late duplicate.', { 
            processId,
            myStartedAt: new Date(myStartedAt).toISOString(),
            earlierStartedAt: dbProcess.startedAt.toISOString()
          });
          return;
        }

        const content = process.filesToProcess[filename];
        
        // Analysis: lines and words
        const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
        const words = content.split(/\s+/).filter(word => word.length > 0);

        totalWords += words.length;
        totalLines += lines.length;
        processedFilenames.push(filename);

        // AI: Generate summary
        fileSummaries[filename] = await this._summarizer.summarize(content);

        // Accurate Word Frequency: process every word
        for (const word of words) {
          const cleanWord = word.toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, '');
          if (cleanWord.length > 0) {
            const currentCount = globalWordFrequencies.get(cleanWord) || 0;
            globalWordFrequencies.set(cleanWord, currentCount + 1);
          }
        }

        // Calculate current Top 5 from the full map
        const topWords = Array.from(globalWordFrequencies.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([word]) => word);

        process.recordProcessResults({
          totalWords,
          totalLines,
          filesProcessed: [...processedFilenames],
          mostFrequentWords: topWords,
          fileSummaries: { ...fileSummaries },
        });
        await this._processRepo.save(process);
        
        logger.info(`Worker: Processed file ${filename}`, { 
          processId, 
          words: words.length, 
          lines: lines.length 
        });

        // --- DEBUG HOOKS ---
        // These hooks facilitate testing 'STOPPED' and 'FAILED' functionality.
        // Safety: Only allowed if APP_STAGE does not contain 'prod'.
        if (!APP_STAGE!.toString().includes('prod')) {
          const debugDelay = TEST_WORKER_DELAY_SECONDS;
          if (debugDelay) {
            logger.info(`Worker: Debug delay enabled (${debugDelay}s). Waiting...`, { processId, stage: APP_STAGE });
            await new Promise(resolve => setTimeout(resolve, parseInt(debugDelay) * 1000));
          }

          if (TEST_WORKER_FORCE_FAILURE === 'true') {
            logger.info('Worker: Debug force failure enabled. Throwing error...', { processId, stage: APP_STAGE });
            throw new Error('Simulated error for testing');
          }
        }
        // -------------------
      }

      logger.info('Worker: Successfully completed process.', { processId });

    } catch (error: any) {
      logger.error('Worker: Error during processing.', {
        error: error.message,
        processId
      });
      
      process.fail();
      await this._processRepo.save(process);
      throw error;
    }
  }
}
