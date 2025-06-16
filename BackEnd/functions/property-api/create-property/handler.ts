import { AppSyncResolverEvent, AppSyncIdentityCognito } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = process.env.TABLE_NAME!;

interface CreatePropertyInput {
  title: string;
  description: string;
  price: number;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  images: string[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

interface Property extends CreatePropertyInput {
  id: string;
  status: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export const handler = async (
  event: AppSyncResolverEvent<{ input: CreatePropertyInput }>
): Promise<Property> => {
  console.log('CreateProperty event:', JSON.stringify(event, null, 2));

  const { input } = event.arguments;
  const timestamp = new Date().toISOString();
  
  // Check if user is authenticated
  let userId: string | undefined;
  if (event.identity && 'sub' in event.identity) {
    const cognitoIdentity = event.identity as AppSyncIdentityCognito;
    userId = cognitoIdentity.sub;
  }

  // Create property object
  const property: Property = {
    id: randomUUID(),
    ...input,
    status: 'PENDING', // All new properties start as pending for review
    userId, // Will be undefined for public submissions
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Validate required fields
  if (!input.title || !input.description || !input.price || !input.address) {
    throw new Error('Missing required fields');
  }

  // Validate images array
  if (!input.images || input.images.length === 0) {
    throw new Error('At least one image is required');
  }

  if (input.images.length > 10) {
    throw new Error('Maximum 10 images allowed');
  }

  try {
    // Save to DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: property,
      })
    );

    console.log('Property created successfully:', property.id);

    // TODO: Send notification email to admin for review
    // TODO: Send confirmation email to contact email

    return property;
  } catch (error) {
    console.error('Error creating property:', error);
    throw new Error('Failed to create property');
  }
};