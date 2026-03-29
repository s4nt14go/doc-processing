import { PROCESS_STATUS, ProcessStatus } from './ProcessStatus.ts';
import { ProcessProgress } from './ProcessProgress.ts';
import type { ProcessProgressDto } from './ProcessProgress.ts';
import { ProcessResults } from './ProcessResults.ts';
import type { ProcessResultsDto } from './ProcessResults.ts';
import { Entity } from '../../../shared/core/domain/Entity.ts';
import { EntityID } from '../../../shared/core/domain/EntityID.ts';
import { Spread } from '../../../shared/utils/utils.ts';

export interface ProcessProps {
  status: ProcessStatus;
  filesToProcess: Record<string, string>; // Maps filename to its content
  progress: ProcessProgress | null;
  startedAt: Date | null;
  estimatedCompletion: Date | null;
  results: ProcessResults | null;
  completedAt: Date | null;
}

export type ProcessDto = Spread<ProcessProps, {
  id: string;
  status: string;
  progress: ProcessProgressDto | null;
  startedAt: string | null;
  estimatedCompletion: string | null;
  results: ProcessResultsDto | null;
  completedAt: string | null;
}>

export class Process extends Entity<
  ProcessProps,
  ProcessDto
> {
  private __class = this.constructor.name;
  private constructor(props: ProcessProps, id: EntityID) {
    super(props, id);
  }

  public static create(files: { name: string; content: string }[]): Process {
    const filesToProcess = files.reduce((acc, file) => {
      acc[file.name] = file.content;
      return acc;
    }, {} as Record<string, string>);

    return new Process({
      status: PROCESS_STATUS.PENDING,
      filesToProcess,
      progress: null,
      startedAt: null,
      estimatedCompletion: null,
      results: null,
      completedAt: null,
    }, new EntityID());
  }

  public static assemble(dto: ProcessDto): Process {
    return new Process({
      status: dto.status as ProcessStatus,
      filesToProcess: dto.filesToProcess,
      progress: dto.progress ? ProcessProgress.assemble(dto.progress) : null,
      startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
      estimatedCompletion: dto.estimatedCompletion ? new Date(dto.estimatedCompletion) : null,
      results: dto.results ? ProcessResults.assemble(dto.results) : null,
      completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
    }, new EntityID(dto.id));
  }

  get status(): ProcessProps['status'] { return this.props.status; }
  get filesToProcess(): Record<string, string> { return this.props.filesToProcess; }
  get filenamesToProcess(): string[] { return Object.keys(this.props.filesToProcess); }
  get progress(): ProcessProps['progress'] { return this.props.progress; }
  get startedAt(): ProcessProps['startedAt'] { return this.props.startedAt; }
  get estimatedCompletion(): ProcessProps['estimatedCompletion'] { return this.props.estimatedCompletion; }
  get results(): ProcessProps['results'] { return this.props.results; }
  get completedAt(): ProcessProps['completedAt'] { return this.props.completedAt; }

  public start(): void {
    if (this.props.status !== PROCESS_STATUS.PENDING)
      throw new Error(`Cannot start process in status ${this.props.status}`);

    this.props.status = PROCESS_STATUS.RUNNING;
    this.props.progress = ProcessProgress.create(this.filenamesToProcess.length);
    this.props.results = ProcessResults.create();
    this.props.startedAt = new Date();
  }

  // The exclamation marks below are intentional. If any of these properties are not defined, the system is in an inconsistent state, and we assume a runtime error is acceptable. Another alternative would be responding to the client with an error with a certain format, it depends on the client.

  public filesProcessed(currentResults: ProcessResults): void {
    if (this.props.status !== PROCESS_STATUS.RUNNING)
      throw new Error(`Cannot update progress in status ${this.props.status}`);

    const { filesProcessed } = currentResults;
    const filenamesToProcess = this.filenamesToProcess;

    if (filesProcessed.some((f) => !filenamesToProcess.includes(f)))
      throw new Error(`Unexpected files processed: ${filesProcessed.join(', ')}. Expected: ${filenamesToProcess.join(', ')}`);

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

    const total = this.filenamesToProcess.length;
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
      filesToProcess: this.props.filesToProcess,
      progress: this.props.progress ? this.props.progress.toDto() : null,
      startedAt: this.props.startedAt ? this.props.startedAt.toISOString() : null,
      estimatedCompletion: this.props.estimatedCompletion ? this.props.estimatedCompletion.toISOString() : null,
      results: this.props.results ? this.props.results.toDto() : null,
      completedAt: this.props.completedAt ? this.props.completedAt.toISOString() : null,
    };
  }
}
