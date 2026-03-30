import { IProcessRepo } from '../../repos/IProcessRepo.ts';
import { ProcessMetadata } from '../../domain/Process.ts';

/**
 * Use case responsible for listing all document processing tasks.
 */
export class ListProcesses {
  constructor(private readonly _processRepo: IProcessRepo) {}

  /**
   * Executes the use case.
   * @returns A list of ProcessMetadata for all processes.
   */
  public async execute(): Promise<ProcessMetadata[]> {
    const processes = await this._processRepo.listAll();
    return processes.map(process => process.toMetadata());
  }
}
