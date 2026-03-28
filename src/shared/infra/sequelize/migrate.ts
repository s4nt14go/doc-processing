import 'dotenv/config';
import { Umzug, SequelizeStorage } from 'umzug';
import { initializeDatabase } from './database.ts';
import { logger } from '../logger/Logger.ts';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Reusable migration runner using Umzug.
 */
const run = async () => {
  const command = process.argv[2] || 'up';

  try {
    const sequelize = await initializeDatabase();

    const umzug = new Umzug({
      migrations: {
        glob: ['migrations/*.ts', { cwd: __dirname }],
        resolve: ({ name, path: migrationPath }) => {
          return {
            name,
            up: async () => {
              const migration = await import(`file://${migrationPath}`);
              return migration.up(sequelize.getQueryInterface());
            },
            down: async () => {
              const migration = await import(`file://${migrationPath}`);
              return migration.down(sequelize.getQueryInterface());
            },
          };
        },
      },
      storage: new SequelizeStorage({ sequelize }),
      context: sequelize.getQueryInterface(),
      logger: console,
    });

    if (command === 'up') {
      const executed = await umzug.up();
      if (executed.length === 0) {
        logger.info('Database is already up to date.');
      } else {
        logger.info(`Successfully executed ${executed.length} migration(s):`, {
          migrations: executed.map((m) => m.name),
        });
      }
    } else if (command === 'down') {
      const undone = await umzug.down();
      if (undone.length === 0) {
        logger.info('No migrations found to undo.');
      } else {
        logger.info(`Successfully undone ${undone.length} migration(s):`, {
          migrations: undone.map((m) => m.name),
        });
      }
    } else if (command === 'status') {
      const executed = await umzug.executed();
      const pending = await umzug.pending();
      
      console.log('\n--- Migration Status ---');
      console.log(`Executed: ${executed.length}`);
      executed.forEach(m => console.log(` [X] ${m.name}`));
      
      console.log(`\nPending: ${pending.length}`);
      pending.forEach(m => console.log(` [ ] ${m.name}`));
      console.log('------------------------\n');
    } else {
      logger.error(`Unknown command: ${command}. Use 'up' or 'down'.`);
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    logger.error(`Critical error during migration ${command}:`, { error });
    process.exit(1);
  }
};

run();
