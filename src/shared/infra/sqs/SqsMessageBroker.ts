import { IMessageBroker } from '../../../modules/documentProcessing/services/IMessageBroker.ts';
import { logger } from '../logger/Logger.ts';

/**
 * Infrastructure implementation of the IMessageBroker.
 * Currently, it only logs the message. In a later stage, it will 
 * send the processId to an AWS SQS queue to trigger the worker.
 */
export class SqsMessageBroker implements IMessageBroker {
  /**
   * Notifies that a new process has started.
   * Currently acts as a placeholder that logs the event.
   * @param processId The ID of the process to be processed by the worker.
   */
  public async notifyProcessStarted(processId: string): Promise<void> {
    logger.info('Message Broker: Notifying that process has started.', { 
      processId,
      transport: 'log (placeholder for SQS)' 
    });
    
    // In the future, this is where the @aws-sdk/client-sqs call will go.
    return Promise.resolve();
  }
}
