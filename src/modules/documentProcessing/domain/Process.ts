import { PROCESS_STATUS, ProcessStatus } from './ProcessStatus.ts';
import { ProcessProgress, ProcessProgressDto } from './ProcessProgress.ts';
import { ProcessResults, ProcessResultsDto } from './ProcessResults.ts';
import { Entity } from '@shared/core/domain/Entity.js';
import { EntityID } from '@shared/core/domain/EntityID.js';
import { Spread } from '@shared/utils/utils.js';

export interface ProcessProps {
  status: ProcessStatus;
  filesToProcess: string[];
  progress?: ProcessProgress;
  startedAt?: Date;
  estimatedCompletion?: Date;
  results?: ProcessResults;
  completedAt?: Date;
}

type ProcessDto = Spread<ProcessProps, {
  id: string;
  status: string;
  progress?: ProcessProgressDto;
  startedAt?: string;
  estimatedCompletion?: string;
  results?: ProcessResultsDto;
  completedAt?: string;
}>

export class Process extends Entity<
  ProcessProps,
  ProcessDto
> {
  private __class = this.constructor.name;
  private constructor(props: ProcessProps, id: EntityID) {
    super(props, id);
  }

  public static create(filesToProcess: string[]): Process {
    return new Process({
      status: PROCESS_STATUS.PENDING,
      filesToProcess,
    }, new EntityID());
  }

  get status(): ProcessProps['status'] { return this.props.status; }
  get filesToProcess(): ProcessProps['filesToProcess'] { return this.props.filesToProcess; }
  get progress(): ProcessProps['progress'] { return this.props.progress; }
  get startedAt(): ProcessProps['startedAt'] { return this.props.startedAt; }
  get estimatedCompletion(): ProcessProps['estimatedCompletion'] { return this.props.estimatedCompletion; }
  get results(): ProcessProps['results'] { return this.props.results; }

  public start(filesToProcess: string[]): void {
    if (this.props.status !== PROCESS_STATUS.PENDING)
      throw new Error(`Cannot start process in status ${this.props.status}`);

    this.props.status = PROCESS_STATUS.RUNNING;
    this.props.filesToProcess = filesToProcess;
    this.props.progress = ProcessProgress.create(filesToProcess.length);
    this.props.results = ProcessResults.create();
    this.props.startedAt = new Date();
  }

  // The exclamation marks below are intentional. If any of these properties are not defined, the system is in an inconsistent state, and we assume a runtime error is acceptable. Another alternative would be responding to the client with an error with a certain format, it depends on the client.

  public filesProcessed(currentResults: ProcessResults): void {
    if (this.props.status !== PROCESS_STATUS.RUNNING)
      throw new Error(`Cannot update progress in status ${this.props.status}`);

    const { filesProcessed } = currentResults;

    if (filesProcessed.some((f) => !this.props.filesToProcess.includes(f)))
      throw new Error(`Unexpected files processed: ${filesProcessed.join(', ')}. Expected: ${this.props.filesToProcess.join(', ')}`);

    this.props.results!.update(currentResults);
    this.props.progress!.filesProcessed(filesProcessed.length);

    const now = new Date().getTime();
    const averageProcessingTime = (now - this.props.startedAt!.getTime()) / this.props.progress!.processedFiles;
    const remainingFilesToProcess = this.props.progress!.totalFiles - this.props.progress!.processedFiles;
    this.props.estimatedCompletion = new Date(now + averageProcessingTime * remainingFilesToProcess);
    if (remainingFilesToProcess === 0) this.complete();
  }

  private complete(): void {

    if (this.props.status !== PROCESS_STATUS.RUNNING)
      throw new Error(`Cannot complete process in status ${this.props.status}`);

    const total = this.props.filesToProcess.length;
    const totalAccProgress = this.props.progress!.processedFiles;
    const totalAccResults = this.props.results!.filesProcessed.length;
    if (total !== totalAccProgress || totalAccProgress !== totalAccResults)
      throw new Error(`Files to process according input (${total}), according progress (${totalAccProgress}) and according results (${totalAccResults} are not equal.`);

    this.props.status = PROCESS_STATUS.COMPLETED;
    this.props.completedAt = new Date();
  }

  public fail(): void {
    this.props.status = PROCESS_STATUS.FAILED;
  }

  public stop(): void {
    this.props.status = PROCESS_STATUS.STOPPED;
  }

  public toDto(): ProcessDto {
    return {
      id: this._id.toString(),
      status: this.props.status,
      progress: this.props.progress?.toDto(),
      startedAt: this.props.startedAt?.toISOString(),
      estimatedCompletion: this.props.estimatedCompletion?.toISOString(),
      results: this.props.results?.toDto(),
      completedAt: this.props.completedAt?.toISOString(),
      filesToProcess: this.props.filesToProcess,
    };
  }
}
