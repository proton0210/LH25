import { AppSyncResolverHandler } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';

const sqsClient = new SQSClient({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const PROPERTY_UPLOAD_QUEUE_URL = process.env.PROPERTY_UPLOAD_QUEUE_URL!;
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
  propertyId: string;
  message: string;
  queueMessageId?: string;
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

  // Generate property ID
  const propertyId = ulid();
  
  // Prepare message for SQS
  const queueMessage = {
    propertyId,
    input: {
      ...input,
      userId,
      cognitoUserId,
    },
    requestId: propertyId,
    timestamp: new Date().toISOString()
  };

  try {
    // Send message to SQS queue
    const command = new SendMessageCommand({
      QueueUrl: PROPERTY_UPLOAD_QUEUE_URL,
      MessageBody: JSON.stringify(queueMessage),
      MessageAttributes: {
        propertyId: {
          DataType: 'String',
          StringValue: propertyId
        },
        userId: {
          DataType: 'String',
          StringValue: userId || 'anonymous'
        }
      }
    });

    const result = await sqsClient.send(command);

    console.log('Sent property upload message to queue:', result.MessageId);

    return {
      propertyId,
      message: 'Property upload request received. You will receive an email notification once your listing is processed.',
      queueMessageId: result.MessageId
    };
  } catch (error) {
    console.error('Error sending property upload to queue:', error);
    throw new Error('Failed to submit property upload request');
  }
};