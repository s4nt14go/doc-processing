import { IProcessRepo } from '../../repos/IProcessRepo.ts';
import { logger } from '../../../../shared/infra/logger/Logger.ts';
import { PROCESS_STATUS } from '../../domain/ProcessStatus.ts';
import { ISummarizer } from '../../services/ISummarizer.ts';
import { getErrMsg } from '../../../../shared/utils/utils.ts';

const { 
  APP_STAGE, 
  TEST_WORKER_DELAY_SECONDS, 
  TEST_WORKER_FORCE_FAILURE 
} = process.env;

// CONCURRENCY defines how many files are processed in parallel within a single worker instance.
// High values are constrained by:
// 1. AI API Rate Limits: Most providers (like Gemini) have RPM (Requests Per Minute) limits.
// 2. Lambda Resources: Higher concurrency increases memory and CPU usage per execution.
const CONCURRENCY = 3;

if (!APP_STAGE)
  throw new Error('APP_STAGE environment variable is required but not defined.');

/**
 * Processes files within a batch using controlled concurrency.
 */
export class Worker {
  private readonly _processRepo: IProcessRepo;
  private readonly _summarizer: ISummarizer;

  public constructor(dependencies: {
    processRepo: IProcessRepo;
    summarizer: ISummarizer;
  }) {
    this._processRepo = dependencies.processRepo;
    this._summarizer = dependencies.summarizer;
  }

  public async execute(processId: string): Promise<void> {
    logger.info('Worker: Starting execution for process.', { processId, concurrency: CONCURRENCY });

    const process = await this._processRepo.findById(processId);
    if (!process)
      throw new Error(`Process with id ${processId} not found`);

    try {
      // Allow processing if status is PENDING, FAILED (retry) or even RUNNING (already picked up)
      if (process.status === PROCESS_STATUS.PENDING || process.status === PROCESS_STATUS.FAILED) {
        process.start();
        await this._processRepo.save(process);
      } else if (process.status !== PROCESS_STATUS.RUNNING) {
        logger.info('Worker: Process is not in a startable state.', { processId, status: process.status });
        return;
      }

      // We use the current startedAt as our unique execution ID for this worker session
      const myStartedAt = process.startedAt!.getTime();

      const filenames = [...process.filenamesToProcess];
      const globalWordFrequencies = new Map<string, number>();
      let totalWords = 0;
      let totalLines = 0;
      let totalCharacters = 0;
      const processedFilenames: string[] = [];
      const fileSummaries: Record<string, string> = {};

      // Process files in chunks to control concurrency
      for (let i = 0; i < filenames.length; i += CONCURRENCY) {
        const chunk = filenames.slice(i, i + CONCURRENCY);
        
        // 1. Re-fetch and integrity check before starting a new chunk
        const dbProcess = await this._processRepo.findById(processId);
        
        // We allow RUNNING (standard) or FAILED (in case we are retrying and haven't updated it yet)
        const isValidStatus = dbProcess && (dbProcess.status === PROCESS_STATUS.RUNNING || dbProcess.status === PROCESS_STATUS.FAILED);
        
        if (!isValidStatus) {
          logger.info('Worker: Process no longer in a valid state for processing. Aborting chunk.', { processId, status: dbProcess?.status });
          return;
        }

        // If someone else started earlier than me, check if they are still active.
        if (dbProcess!.startedAt && dbProcess!.startedAt.getTime() < myStartedAt) {
          if (dbProcess!.status === PROCESS_STATUS.RUNNING) {
            logger.info('Worker: An earlier instance is ACTIVE and processing. Aborting late duplicate chunk.', { 
              processId,
              myStartedAt: new Date(myStartedAt).toISOString(),
              earlierStartedAt: dbProcess!.startedAt.toISOString()
            });
            return;
          }
          
          // If the earlier instance is not RUNNING (e.g., it FAILED), I take over.
          logger.info('Worker: An earlier instance exists but is not RUNNING. Taking over processing.', { 
            processId,
            earlierStatus: dbProcess!.status 
          });
        }

        // 2. Execute chunk in parallel
        logger.info(`Worker: Processing chunk of ${chunk.length} files...`, { processId });
        
        const chunkResults = await Promise.all(chunk.map(async (filename) => {
          const content = process.filesToProcess[filename];
          
          // Local Analysis (CPU bound but fast)
          const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
          const words = content.split(/\s+/).filter(word => word.length > 0);
          
          // AI Summary (I/O bound - this is where parallelism shines)
          const summary = await this._summarizer.summarize(content);

          // Local Word Frequency
          const localFreq = new Map<string, number>();
          for (const word of words) {
            const cleanWord = word.toLowerCase().replace(/[^a-z0-9áéíóúñ]/g, '');
            if (cleanWord.length > 0) {
              localFreq.set(cleanWord, (localFreq.get(cleanWord) || 0) + 1);
            }
          }

          return {
            filename,
            wordCount: words.length,
            lineCount: lines.length,
            charCount: content.length,
            summary,
            localFreq
          };
        }));

        // 3. Aggregate results and handle debug hooks
        for (const res of chunkResults) {
          totalWords += res.wordCount;
          totalLines += res.lineCount;
          totalCharacters += res.charCount;
          processedFilenames.push(res.filename);
          fileSummaries[res.filename] = res.summary;

          for (const [word, count] of res.localFreq.entries()) {
            globalWordFrequencies.set(word, (globalWordFrequencies.get(word) || 0) + count);
          }

          // Individual debug hooks (maintained for testing STOP between files)
          if (!APP_STAGE!.includes('prod')) {
            if (TEST_WORKER_DELAY_SECONDS) {
              await new Promise(resolve => setTimeout(resolve, parseInt(TEST_WORKER_DELAY_SECONDS) * 1000));
            }
            if (TEST_WORKER_FORCE_FAILURE === 'true') {
              throw new Error('Simulated error for testing');
            }
          }
        }

        // 4. Persist progress after chunk completion
        const topWords = Array.from(globalWordFrequencies.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([word]) => word);

        process.recordProcessResults({
          totalWords,
          totalLines,
          totalCharacters,
          filesProcessed: [...processedFilenames],
          mostFrequentWords: topWords,
          fileSummaries: { ...fileSummaries },
        });

        await this._processRepo.save(process);
        logger.info(`Worker: Completed chunk up to ${processedFilenames.length}/${filenames.length} files.`, { processId });
      }

      logger.info('Worker: Successfully completed all files.', { processId });

    } catch (e: unknown) {
      logger.error('Worker: Error during processing.', { error: getErrMsg(e), processId });
      process.fail();
      await this._processRepo.save(process);
      throw e;
    }
  }
}
