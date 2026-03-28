import { Sequelize } from 'sequelize';
import { logger } from '../logger/Logger.ts';
import { initProcessModel } from './models/ProcessModel.ts';

/**
 * Global Sequelize instance for the application.
 * CockroachDB is used as the primary database, being fully compatible with the PostgreSQL protocol.
 */
let sequelizeInstance: Sequelize | null = null;

/**
 * Initializes the database connection and models.
 * Optimized for AWS Lambda / Serverless environments.
 */
export const initializeDatabase = async (): Promise<Sequelize> => {
  if (sequelizeInstance) return sequelizeInstance;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined');
  }

  sequelizeInstance = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false, // Required for CockroachDB Cloud
      },
      application_name: 'doc-processing-service',
    },
    // Pool configuration optimized for Lambda and CockroachDB
    pool: {
      max: 2,
      min: 0,
      acquire: 7000,
      idle: 0,
      evict: 10000,
    },
  });

  // Initialize all models
  initProcessModel(sequelizeInstance);

  try {
    await sequelizeInstance.authenticate();
    logger.info('Database connection established successfully with CockroachDB.');
  } catch (error) {
    logger.error('Unable to connect to the database:', { error });
    throw error;
  }

  return sequelizeInstance;
};

/**
 * Helper to get the Sequelize instance. Throws if not initialized.
 */
export const getSequelize = (): Sequelize => {
  if (!sequelizeInstance) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return sequelizeInstance;
};
