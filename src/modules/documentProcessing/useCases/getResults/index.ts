import { ModelStatic } from 'sequelize';
import { ProcessRepo } from '../../repos/ProcessRepo.ts';
import { GetResults } from './GetResults.ts';
import {
  initializeDatabase,
} from '../../../../shared/infra/sequelize/database.ts';
import {
  ProcessInstance,
} from '../../../../shared/infra/sequelize/models/ProcessModel.ts';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handlerCatch } from '../../../../shared/utils/utils.ts';

/**
 * AWS Lambda Handler for the GetResults use case.
 * Orchestrates the database connection, repository instantiation,
 * and use case execution for the GET /process/results/{id} endpoint.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Initialize the database connection (optimized for Lambda warm starts)
    const sequelize = await initializeDatabase();
    
    // 2. Resolve the Process model from the Sequelize instance
    const processModel = sequelize.model('Process') as ModelStatic<ProcessInstance>;
    
    // 3. Dependency Injection (Manual Composition Root for this Lambda)
    const repo = new ProcessRepo(processModel);
    const useCase = new GetResults(repo);

    // 4. Extract processId from the path parameters
    const processId = event.pathParameters?.id;

    if (!processId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'A string processId is required as a path parameter' }),
      };
    }

    // 5. Execute the use case
    const response = await useCase.execute(processId);

    // 6. Return response based on execution result
    if (!response) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Process with ID ${processId} not found.` }),
      };
    }

    if (!response.isCompleted) {
      return {
        statusCode: 400, // Or 202 Accepted if you prefer, but 400/409 is common for "not ready"
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: `Results are not ready. Process status is: ${response.status}.`,
          status: response.status, 
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response.results),
    };

  } catch (e: unknown) {
    return handlerCatch('Error in GetResultsHandler', e);
  }
};