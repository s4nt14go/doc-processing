import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Resource } from 'sst';
import { IMessageBroker } from '../../../modules/documentProcessing/services/IMessageBroker.ts';
import { logger } from '../logger/Logger.ts';
import { getErrMsg } from '../../utils/utils.ts';

/**
 * Infrastructure implementation of the IMessageBroker using AWS SQS.
 * Sends the processId to an SQS queue to trigger the asynchronous worker.
 */
export class SqsMessageBroker implements IMessageBroker {
  private readonly _sqsClient: SQSClient;
  private readonly _queueUrl: string;

  public constructor() {
    this._sqsClient = new SQSClient({});
    // Resource.Process.url is automatically injected by SST when the queue is linked
    this._queueUrl = Resource.Process.url;
  }

  /**
   * Notifies that a new process has started by sending its ID to SQS.
   * @param processId The ID of the process to be processed by the worker.
   */
  public async notifyProcessStarted(processId: string): Promise<void> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this._queueUrl,
        MessageBody: JSON.stringify({ processId }),
      });

      await this._sqsClient.send(command);

      logger.info('Message Broker: Successfully sent processId to SQS.', { 
        processId,
        queueUrl: this._queueUrl,
      });
    } catch (e: unknown) {
      const errorMessage = getErrMsg(e);
      logger.error('Message Broker: Error sending message to SQS.', {
        error: errorMessage,
        processId,
        queueUrl: this._queueUrl,
      });
      // Rethrow to let the use case know the notification failed, preserving the original cause
      throw new Error(`Failed to notify message broker: ${errorMessage}`, { cause: e });
    }
  }
}
