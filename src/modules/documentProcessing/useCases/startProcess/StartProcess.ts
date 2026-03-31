import { IProcessRepo } from '../../repos/IProcessRepo.ts';
import { IMessageBroker } from '../../services/IMessageBroker.ts';
import { Process } from '../../domain/Process.ts';

export interface FileToProcessDto {
  name: string;
  content: string;
}

export interface StartProcessRequestDto {
  files: FileToProcessDto[];
}

/**
 * Type Guard to validate the structure of a StartProcessRequestDto.
 */
export function isStartProcessRequestDto(test: unknown): test is StartProcessRequestDto {
  return (
    !!test &&
    typeof test === 'object' &&
    test !== null &&
    'files' in test &&
    Array.isArray(test.files) &&
    test.files.every(
      (file: unknown) =>
        !!file &&
        typeof file === 'object' &&
        file !== null &&
        'name' in file &&
        typeof file.name === 'string' &&
        'content' in file &&
        typeof file.content === 'string',
    )
  );
}

/**
 * Use case responsible for orchestrating the start of a document processing task.
 * 1. Receives the file names and contents via API payload.
 * 2. Creates a PENDING process entity with the provided content.
 * 3. Persists the process in the database.
 * 4. Notifies the message broker to trigger the asynchronous worker.
 */
export class StartProcess {
  private readonly _processRepo: IProcessRepo;
  private readonly _messageBroker: IMessageBroker;

  public constructor(dependencies: {
    processRepo: IProcessRepo;
    messageBroker: IMessageBroker;
  }) {
    this._processRepo = dependencies.processRepo;
    this._messageBroker = dependencies.messageBroker;
  }

  /**
   * Executes the use case.
   * @param request The files (name and content) to be processed.
   * @returns The processId of the newly created process.
   */
  public async execute(request: StartProcessRequestDto): Promise<string> {
    const { files } = request;

    if (!files || files.length === 0) {
      throw new Error('No files provided to process');
    }

    // Step 1: Create a PENDING process entity (Domain layer)
    // The entity now stores the files content directly in a Record<string, string>.
    const process = Process.create(files);

    // Step 2: Persist the process in the database (Persistence layer)
    await this._processRepo.save(process);

    // Step 3: Notify the broker to start the asynchronous worker (Infrastructure layer)
    await this._messageBroker.notifyProcessStarted(process.toDto().id);

    return process.toDto().id;
  }
}
