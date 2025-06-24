import { SQSHandler, SQSEvent } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({ region: process.env.AWS_REGION });

interface PropertyUploadMessage {
  propertyId: string;
  input: any; // The original property creation input
  userId?: string;
  cognitoUserId?: string;
  requestId: string;
  timestamp: string;
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log('Processing property upload messages from SQS:', JSON.stringify(event, null, 2));

  const stateMachineArn = process.env.PROPERTY_UPLOAD_STATE_MACHINE_ARN;
  
  if (!stateMachineArn) {
    throw new Error('PROPERTY_UPLOAD_STATE_MACHINE_ARN not configured');
  }

  for (const record of event.Records) {
    try {
      const message: PropertyUploadMessage = JSON.parse(record.body);
      console.log(`Processing property upload from queue: ${message.propertyId}`);

      // Start Step Functions execution
      const executionName = `property-upload-${message.propertyId}-${Date.now()}`;
      
      const startExecutionCommand = new StartExecutionCommand({
        stateMachineArn: stateMachineArn,
        name: executionName,
        input: JSON.stringify({
          ...message.input,
          propertyId: message.propertyId,
          userId: message.userId,
          cognitoUserId: message.cognitoUserId,
          requestId: message.requestId,
          timestamp: message.timestamp
        })
      });
      
      const sfnResponse = await sfnClient.send(startExecutionCommand);
      console.log(`Started property upload workflow: ${sfnResponse.executionArn}`);
      
    } catch (error) {
      console.error('Error processing message:', error);
      throw error; // Let SQS handle retry
    }
  }
};