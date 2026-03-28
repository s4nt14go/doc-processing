import { DataTypes, Sequelize, Model } from 'sequelize';
import type { ModelStatic } from 'sequelize';
import { PROCESS_STATUS_VALUES } from '../../../../modules/documentProcessing/domain/ProcessStatus.ts';
import type { ProcessDto } from '../../../../modules/documentProcessing/domain/Process.ts';

/**
 * Mapping the DTO to model attributes.
 * While the DTO uses ISO strings for dates to facilitate serialization, 
 * Sequelize works with Date objects internally for DATE columns.
 */
export type ProcessModelAttributes = Omit<ProcessDto, 'startedAt' | 'estimatedCompletion' | 'completedAt'> & {
  startedAt: Date | null;
  estimatedCompletion: Date | null;
  completedAt: Date | null;
};

export type ProcessInstance = Model<ProcessModelAttributes> & ProcessModelAttributes;

export const initProcessModel = (sequelize: Sequelize): ModelStatic<ProcessInstance> => {
  return sequelize.define<ProcessInstance>(
    'Process',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      status: {
        type: DataTypes.ENUM(...PROCESS_STATUS_VALUES),
        allowNull: false,
      },
      filesToProcess: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      progress: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      estimatedCompletion: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      results: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'processes',
      timestamps: true,
    }
  );
};
