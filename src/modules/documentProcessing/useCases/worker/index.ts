import { SQSEvent } from 'aws-lambda';
import { ModelStatic } from 'sequelize';
import { ProcessRepo } from '../../repos/ProcessRepo.ts';
import { Worker } from './Worker.ts';
import { GeminiAdapter } from '../../../../shared/infra/ai/GeminiAdapter.ts';
import {
  initializeDatabase,
} from '../../../../shared/infra/sequelize/database.ts';
import {
  ProcessInstance,
} from '../../../../shared/infra/sequelize/models/ProcessModel.ts';
import { logger } from '../../../../shared/infra/logger/Logger.ts';
import { getErrMsg, getErrStack } from '../../../../shared/utils/utils.ts';

/**
 * AWS Lambda Handler for the Worker use case.
 * Triggered by SQS messages containing the processId.
 */
export const handler = async (event: SQSEvent) => {
  try {
    const sequelize = await initializeDatabase();
    const processModel = sequelize.model('Process') as ModelStatic<ProcessInstance>;
    const processRepo = new ProcessRepo(processModel);
    const summarizer = new GeminiAdapter();
    const useCase = new Worker({ processRepo, summarizer });

    for (const record of event.Records) {
      const body = JSON.parse(record.body);
      const { processId } = body;

      if (!processId || typeof processId !== 'string') {
        logger.error('Worker Handler: processId not found or not a string.', { body });
        continue;
      }

      await useCase.execute(processId);
    }

  } catch (e: unknown) {
    logger.error('Error in WorkerHandler', { 
      error: getErrMsg(e),
      stack: getErrStack(e),
    });
    // In SQS handlers, throwing an error will make the message return to the queue (retry)
    throw e;
  }
};
