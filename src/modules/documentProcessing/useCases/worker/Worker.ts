import { IProcessRepo } from '../../repos/IProcessRepo.ts';
import { logger } from '../../../../shared/infra/logger/Logger.ts';

export interface WorkerRequestDto {
  processId: string;
}

/**
 * Processes files within a batch.
 */
export class Worker {
  constructor(private readonly _processRepo: IProcessRepo) {}

  public async execute(request: WorkerRequestDto): Promise<void> {
    const { processId } = request;

    logger.info('Worker: Starting execution for process.', { processId });

    const process = await this._processRepo.findById(processId);
    if (!process) {
      throw new Error(`Process with id ${processId} not found`);
    }

    try {
      process.start();
      await this._processRepo.save(process);

      const filenames = process.filenamesToProcess;
      
      const globalWordFrequencies = new Map<string, number>();
      let totalWords = 0;
      let totalLines = 0;
      const processedFilenames: string[] = [];

      for (const filename of filenames) {
        const content = process.filesToProcess[filename];
        
        // Analysis: lines and words
        const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
        const words = content.split(/\s+/).filter(word => word.length > 0);

        totalWords += words.length;
        totalLines += lines.length;
        processedFilenames.push(filename);

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
          mostFrequentWords: topWords
        });
        await this._processRepo.save(process);
        
        logger.info(`Worker: Processed file ${filename}`, { 
          processId, 
          words: words.length, 
          lines: lines.length 
        });
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
