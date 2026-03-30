import { IProcessRepo } from '../../repos/IProcessRepo.ts';
import { ProcessMetadata } from '../../domain/Process.ts';

export class StopProcess {
  private readonly processRepo: IProcessRepo;

  constructor(processRepo: IProcessRepo) {
    this.processRepo = processRepo;
  }

  public async execute(processId: string): Promise<ProcessMetadata> {
    const process = await this.processRepo.findById(processId);

    if (!process)
      throw new Error(`Process with ID ${processId} not found.`);

    // Call the stop method on the domain entity
    process.stop();

    // Save the updated process
    await this.processRepo.save(process);

    return process.toMetadata();
  }
}
