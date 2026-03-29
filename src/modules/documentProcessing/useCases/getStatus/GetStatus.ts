import { IProcessRepo } from '../../repos/IProcessRepo.ts';
import { ProcessMetadata } from '../../domain/Process.ts';

export interface GetStatusRequestDto {
  processId: string;
}

/**
 * Use case responsible for retrieving the current status and progress of a processing task.
 */
export class GetStatus {
  constructor(private readonly _processRepo: IProcessRepo) {}

  /**
   * Executes the use case.
   * @param request The processId to query.
   * @returns The ProcessMetadata with current status and results.
   */
  public async execute(request: GetStatusRequestDto): Promise<ProcessMetadata> {
    const { processId } = request;

    if (!processId) {
      throw new Error('processId is required');
    }

    // Retrieve the process from the repository
    const process = await this._processRepo.findById(processId);

    if (!process) {
      throw new Error(`Process with id ${processId} not found`);
    }

    return process.toMetadata();
  }
}
