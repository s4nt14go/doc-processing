import type { ModelStatic } from 'sequelize';
import { ProcessRepo } from '../../repos/ProcessRepo.ts';
import { StartProcess, StartProcessRequestDto } from './StartProcess.ts';
import {
  SqsMessageBroker
} from '../../../../shared/infra/sqs/SqsMessageBroker.ts';
import {
  initializeDatabase
} from '../../../../shared/infra/sequelize/database.ts';
import {
  ProcessInstance
} from '../../../../shared/infra/sequelize/models/ProcessModel.ts';
import { logger } from '../../../../shared/infra/logger/Logger.ts';

/**
 * AWS Lambda Handler for the StartProcess use case.
 * Orchestrates the database connection, repository instantiation, 
 * and use case execution for the POST /process/start endpoint.
 */
export const handler = async (event: any) => {
  try {
    // 1. Initialize the database connection (optimized for Lambda warm starts)
    const sequelize = await initializeDatabase();
    
    // 2. Resolve the Process model from the Sequelize instance
    const processModel = sequelize.model('Process') as ModelStatic<ProcessInstance>;
    
    // 3. Dependency Injection (Manual Composition Root for this Lambda)
    const repo = new ProcessRepo(processModel);
    const broker = new SqsMessageBroker();
    const useCase = new StartProcess(repo, broker);

    // 4. Parse the incoming request payload
    let request: StartProcessRequestDto;
    try {
      request = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      throw new Error('Invalid JSON payload');
    }

    // 5. Execute the use case
    const processId = await useCase.execute(request);

    // 6. Return a successful response following the README format
    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ process_id: processId }),
    };

  } catch (error: any) {
    logger.error('Error in StartProcessHandler', { 
      error: error.message,
      stack: error.stack 
    });

    // 7. Simplified error handling: Always return 500 on failure for now.
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: error.message || 'Internal Server Error' 
      }),
    };
  }
};
