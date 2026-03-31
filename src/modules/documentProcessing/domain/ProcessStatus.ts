export const PROCESS_STATUS = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  STOPPED: 'STOPPED',
} as const;

export type ProcessStatus =
  (typeof PROCESS_STATUS)[keyof typeof PROCESS_STATUS];

// Keep in sync with Sequelize migrations and model
export const PROCESS_STATUS_VALUES = Object.values(PROCESS_STATUS);
