/**
 * Interface for decoupling the process triggering from SQS.
 * This is a domain port that will be implemented by an infrastructure adapter.
 */
export interface IMessageBroker {
  /**
   * Sends a message to notify that a new process should be started.
   * @param processId The unique identifier of the process to start.
   */
  notifyProcessStarted(processId: string): Promise<void>;
}
