import { Process } from '../domain/Process.ts';

export interface IProcessRepo {
  save(process: Process): Promise<void>;
  findById(id: string): Promise<Process | null>;
  listAll(): Promise<Process[]>;
}
