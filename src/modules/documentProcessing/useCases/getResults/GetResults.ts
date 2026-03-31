import { IProcessRepo } from '../../repos/IProcessRepo.ts';
import { PROCESS_STATUS } from '../../domain/ProcessStatus.ts';
import { Process } from '../../domain/Process.ts';

export interface GetResultsResponse {
  isCompleted: boolean;
  status: string;
  results?: Process['results'];
}

/**
 * Use case responsible for retrieving the analysis results of a task.
 */
export class GetResults {
  public constructor(private readonly _processRepo: IProcessRepo) {}

  /**
   * Executes the use case.
   * @param processId The processId to query.
   * @returns A response object indicating if it's completed and the results if available.
   */
  public async execute(processId: string): Promise<GetResultsResponse | null> {
    const process = await this._processRepo.findById(processId);

    if (!process) {
      return null; // Handle 404 in the handler
    }

    if (process.status !== PROCESS_STATUS.COMPLETED) {
      return {
        isCompleted: false,
        status: process.status,
      };
    }

    return {
      isCompleted: true,
      status: process.status,
      results: process.results,
    };
  }
}
