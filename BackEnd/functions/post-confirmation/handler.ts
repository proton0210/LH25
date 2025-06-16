import { PostConfirmationTriggerHandler, PostConfirmationTriggerEvent } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({});
const STATE_MACHINE_ARN = process.env.USER_CREATION_STATE_MACHINE_ARN!;

export const handler: PostConfirmationTriggerHandler = async (
  event: PostConfirmationTriggerEvent
) => {
  console.log('PostConfirmation trigger received event:', JSON.stringify(event, null, 2));

  const { userAttributes } = event.request;
  const { sub, email, 'custom:firstName': firstName, 'custom:lastName': lastName, 'custom:contactNumber': contactNumber } = userAttributes;

  try {
    // Prepare input for Step Functions
    const stateMachineInput = {
      cognitoUserId: sub,
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      contactNumber: contactNumber || ''
    };

    console.log('Starting Step Functions execution with input:', stateMachineInput);

    // Start Step Functions execution
    const startExecutionCommand = new StartExecutionCommand({
      stateMachineArn: STATE_MACHINE_ARN,
      name: `user-creation-${sub}-${Date.now()}`,
      input: JSON.stringify(stateMachineInput)
    });

    const response = await sfnClient.send(startExecutionCommand);
    console.log('Step Functions execution started:', response.executionArn);
    
    // Return the event to continue the authentication flow
    return event;
  } catch (error) {
    console.error('Error in PostConfirmation trigger:', error);
    throw error;
  }
};