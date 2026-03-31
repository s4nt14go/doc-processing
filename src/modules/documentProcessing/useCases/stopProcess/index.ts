import { ModelStatic } from 'sequelize';
import { ProcessRepo } from '../../repos/ProcessRepo.ts';
import { StopProcess } from './StopProcess.ts';
import {
  initializeDatabase,
} from '../../../../shared/infra/sequelize/database.ts';
import {
  ProcessInstance,
} from '../../../../shared/infra/sequelize/models/ProcessModel.ts';
import { handlerCatch } from '../../../../shared/utils/utils.ts';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * AWS Lambda Handler for the StopProcess use case.
 * Orchestrates the database connection, repository instantiation, 
 * and use case execution for the POST /process/stop endpoint.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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

    if (!processId)
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

  } catch (e: unknown) {
    return handlerCatch('Error in StopProcessHandler', e);
  }
};