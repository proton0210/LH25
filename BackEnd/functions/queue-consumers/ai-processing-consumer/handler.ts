import { SQSHandler, SQSEvent } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({ region: process.env.AWS_REGION });

interface AIProcessingMessage {
  reportId: string;
  userId: string;
  cognitoUserId?: string;
  input: any; // The original report generation input
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log('Processing AI messages from SQS:', JSON.stringify(event, null, 2));

  const stateMachineArn = process.env.REPORT_GENERATION_STATE_MACHINE_ARN;
  
  if (!stateMachineArn) {
    throw new Error('REPORT_GENERATION_STATE_MACHINE_ARN not configured');
  }

  for (const record of event.Records) {
    try {
      const message: AIProcessingMessage = JSON.parse(record.body);
      console.log(`Processing AI report from queue: ${message.reportId}`);

      // Start Step Functions execution
      const executionName = `report-${message.reportId}-${Date.now()}`;
      
      const startExecutionCommand = new StartExecutionCommand({
        stateMachineArn: stateMachineArn,
        name: executionName,
        input: JSON.stringify({
          reportId: message.reportId,
          userId: message.userId,
          cognitoUserId: message.cognitoUserId,
          input: message.input
        })
      });
      
      const sfnResponse = await sfnClient.send(startExecutionCommand);
      console.log(`Started report generation workflow: ${sfnResponse.executionArn}`);
      
    } catch (error) {
      console.error('Error processing message:', error);
      throw error; // Let SQS handle retry
    }
  }
};