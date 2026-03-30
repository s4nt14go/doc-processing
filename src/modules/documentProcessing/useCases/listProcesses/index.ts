import type { ModelStatic } from 'sequelize';
import { ProcessRepo } from '../../repos/ProcessRepo.ts';
import { ListProcesses } from './ListProcesses.ts';
import {
  initializeDatabase
} from '../../../../shared/infra/sequelize/database.ts';
import {
  ProcessInstance
} from '../../../../shared/infra/sequelize/models/ProcessModel.ts';
import { logger } from '../../../../shared/infra/logger/Logger.ts';

/**
 * AWS Lambda Handler for the ListProcesses use case.
 * Orchestrates the database connection, repository instantiation,
 * and use case execution for the GET /process/list endpoint.
 */
export const handler = async () => {
  try {
    // 1. Initialize the database connection (optimized for Lambda warm starts)
    const sequelize = await initializeDatabase();
    
    // 2. Resolve the Process model from the Sequelize instance
    const processModel = sequelize.model('Process') as ModelStatic<ProcessInstance>;
    
    // 3. Dependency Injection (Manual Composition Root for this Lambda)
    const repo = new ProcessRepo(processModel);
    const useCase = new ListProcesses(repo);

    // 4. Execute the use case
    const processes = await useCase.execute();

    // 5. Return a successful response
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processes),
    };

  } catch (error: any) {
    logger.error('Error in ListProcessesHandler', { 
      error: error.message,
      stack: error.stack 
    });

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: error.message || 'Internal Server Error' 
      }),
    };
  }
};
