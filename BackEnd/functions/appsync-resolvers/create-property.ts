import { AppSyncResolverHandler } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';

const sfnClient = new SFNClient({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const STATE_MACHINE_ARN = process.env.PROPERTY_UPLOAD_STATE_MACHINE_ARN!;
const USER_TABLE_NAME = process.env.USER_TABLE_NAME!;

interface CreatePropertyInput {
  title: string;
  description: string;
  price: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  propertyType: string;
  listingType: string;
  images: string[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  amenities?: string[];
  yearBuilt?: number;
  lotSize?: number;
  parkingSpaces?: number;
}

interface Property extends CreatePropertyInput {
  id: string;
  submittedBy?: string;
  submittedAt: string;
  updatedAt: string;
  status: string;
  isPublic: boolean;
}

interface PropertyUploadResponse {
  executionArn: string;
  startDate: string;
  message: string;
}

export const handler: AppSyncResolverHandler<{ input: CreatePropertyInput }, PropertyUploadResponse> = async (event) => {
  console.log('CreateProperty event:', JSON.stringify(event, null, 2));

  const { input } = event.arguments;
  const identity = event.identity;

  // Basic validation (detailed validation will be done in Step Functions)
  if (!input.title || !input.description || !input.price || !input.address || 
      !input.city || !input.state || !input.zipCode || !input.contactEmail) {
    throw new Error('Missing required fields');
  }

  // Determine user information
  let userId: string | undefined;
  let cognitoUserId: string | undefined;
  
  if (identity && 'username' in identity) {
    // Cognito authenticated user
    cognitoUserId = identity.username;
    
    // Try to get userId from user table
    try {
      const queryResult = await docClient.send(new QueryCommand({
        TableName: USER_TABLE_NAME,
        IndexName: 'cognitoUserId',
        KeyConditionExpression: 'cognitoUserId = :cognitoUserId',
        ExpressionAttributeValues: {
          ':cognitoUserId': cognitoUserId
        },
        Limit: 1
      }));
      
      if (queryResult.Items && queryResult.Items.length > 0) {
        userId = queryResult.Items[0].userId;
      }
    } catch (error) {
      console.log('Could not retrieve userId:', error);
    }
  }

  // Prepare input for Step Functions
  const stepFunctionInput = {
    ...input,
    userId,
    cognitoUserId,
    requestId: ulid(),
    timestamp: new Date().toISOString()
  };

  try {
    // Start Step Functions execution
    const command = new StartExecutionCommand({
      stateMachineArn: STATE_MACHINE_ARN,
      name: `property-upload-${stepFunctionInput.requestId}`,
      input: JSON.stringify(stepFunctionInput)
    });

    const result = await sfnClient.send(command);

    console.log('Started property upload workflow:', result.executionArn);

    return {
      executionArn: result.executionArn!,
      startDate: result.startDate!.toISOString(),
      message: 'Property upload workflow started successfully. You will receive an email notification once your listing is processed.'
    };
  } catch (error) {
    console.error('Error starting property upload workflow:', error);
    throw new Error('Failed to start property upload process');
  }
};