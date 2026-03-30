import type { ModelStatic } from 'sequelize';
import { ProcessRepo } from '../../repos/ProcessRepo.ts';
import { StopProcess } from './StopProcess.ts';
import {
  initializeDatabase
} from '../../../../shared/infra/sequelize/database.ts';
import {
  ProcessInstance
} from '../../../../shared/infra/sequelize/models/ProcessModel.ts';
import { logger } from '../../../../shared/infra/logger/Logger.ts';

/**
 * AWS Lambda Handler for the StopProcess use case.
 * Orchestrates the database connection, repository instantiation, 
 * and use case execution for the POST /process/stop endpoint.
 */
export const handler = async (event: any) => {
  try {
    // 1. Initialize the database connection (optimized for Lambda warm starts)
    const sequelize = await initializeDatabase();
    
    // 2. Resolve the Process model from the Sequelize instance
    const processModel = sequelize.model('Process') as ModelStatic<ProcessInstance>;
    
    // 3. Dependency Injection (Manual Composition Root for this Lambda)
    const repo = new ProcessRepo(processModel);
    const useCase = new StopProcess(repo);

    // 4. Extract processId from the path parameters
    const processId = event.pathParameters?.id;

    if (!processId || typeof processId !== 'string')
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'A string processId is required as a path parameter' }),
      };

    // 5. Execute the use case
    const processDto = await useCase.execute(processId);

    // 6. Return a successful response
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processDto),
    };

  } catch (error: any) {
    logger.error('Error in StopProcessHandler', { 
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
