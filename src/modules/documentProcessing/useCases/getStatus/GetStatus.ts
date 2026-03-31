import { IProcessRepo } from '../../repos/IProcessRepo.ts';
import { ProcessMetadata } from '../../domain/Process.ts';

/**
 * Use case responsible for retrieving the current status and progress of a processing task.
 */
export class GetStatus {
  public constructor(private readonly _processRepo: IProcessRepo) {}

  /**
   * Executes the use case.
   * @param processId The processId to query.
   * @returns The ProcessMetadata with current status and results.
   */
  public async execute(processId: string): Promise<ProcessMetadata> {
    // Retrieve the process from the repository
    const process = await this._processRepo.findById(processId);

    if (!process)
      throw new Error(`Process with id ${processId} not found`);

    return process.toMetadata();
  }
}
