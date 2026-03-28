import { QueryInterface, DataTypes } from 'sequelize';
import { PROCESS_STATUS_VALUES } from '../../../../modules/documentProcessing/domain/ProcessStatus.ts';

/**
 * Migration to create the 'processes' table with transactions and a CHECK constraint for status.
 */
export async function up(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // 1. Create the table with status as STRING
    await queryInterface.createTable(
      'processes',
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          allowNull: false,
        },
        status: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        filesToProcess: {
          type: DataTypes.JSONB,
          allowNull: false,
        },
        progress: {
          type: DataTypes.JSONB,
        },
        startedAt: {
          type: DataTypes.DATE,
        },
        estimatedCompletion: {
          type: DataTypes.DATE,
        },
        results: {
          type: DataTypes.JSONB,
        },
        completedAt: {
          type: DataTypes.DATE,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      { transaction }
    );

    // 2. Add a CHECK constraint to ensure status only accepts valid domain values
    await queryInterface.addConstraint('processes', {
      fields: ['status'],
      type: 'check',
      where: {
        status: PROCESS_STATUS_VALUES,
      },
      name: 'processes_status_check',
      transaction,
    });

  });
}

export async function down(queryInterface: QueryInterface) {
  return queryInterface.sequelize.transaction(async (transaction) => {
    // 1. Remove the constraint first
    await queryInterface.removeConstraint('processes', 'processes_status_check', { transaction });
    
    // 2. Drop the table
    await queryInterface.dropTable('processes', { transaction });
  });
}
