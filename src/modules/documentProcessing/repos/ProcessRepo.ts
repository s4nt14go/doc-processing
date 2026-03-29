import type { ModelStatic } from 'sequelize';
import { IProcessRepo } from './IProcessRepo.ts';
import { Process } from '../domain/Process.ts';
import type { ProcessDto } from '../domain/Process.ts';
import { ProcessInstance } from '../../../shared/infra/sequelize/models/ProcessModel.ts';

/**
 * Sequelize implementation of the IProcessRepo.
 * Handles persistence for Process domain entities.
 */
export class ProcessRepo implements IProcessRepo {
  private _model: ModelStatic<ProcessInstance>;

  constructor(model: ModelStatic<ProcessInstance>) {
    this._model = model;
  }

  /**
   * Saves or updates a Process entity in the database.
   */
  public async save(process: Process): Promise<void> {
    const dto = process.toDto();
    
    // We prepare the attributes for Sequelize, ensuring dates are Date objects
    const attributes = {
      ...dto,
      startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
      estimatedCompletion: dto.estimatedCompletion ? new Date(dto.estimatedCompletion) : null,
      completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
    };

    await this._model.upsert(attributes);
  }

  /**
   * Finds a Process by its ID and reconstitutes it into a domain entity.
   */
  public async findById(id: string): Promise<Process | null> {
    const instance = await this._model.findByPk(id);
    
    if (!instance) {
      return null;
    }

    return this._mapToDomain(instance);
  }

  /**
   * Lists all processes from the database.
   */
  public async listAll(): Promise<Process[]> {
    const instances = await this._model.findAll();
    return instances.map((instance) => this._mapToDomain(instance));
  }

  /**
   * Maps a Sequelize instance back to a Process domain entity.
   */
  private _mapToDomain(instance: ProcessInstance): Process {
    const values = instance.get();
    
    // Convert Dates back to ISO strings for the Process.assemble method (which expects ProcessDto)
    const dto: ProcessDto = {
      ...values,
      startedAt: values.startedAt ? values.startedAt.toISOString() : null,
      estimatedCompletion: values.estimatedCompletion ? values.estimatedCompletion.toISOString() : null,
      completedAt: values.completedAt ? values.completedAt.toISOString() : null,
    };

    return Process.assemble(dto);
  }
}
