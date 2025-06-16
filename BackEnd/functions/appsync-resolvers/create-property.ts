import { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME!;

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

export const handler: AppSyncResolverHandler<{ input: CreatePropertyInput }, Property> = async (event) => {
  console.log('CreateProperty event:', JSON.stringify(event, null, 2));

  const { input } = event.arguments;
  const identity = event.identity;

  // Validate required fields
  if (!input.title || !input.description || !input.price || !input.address || 
      !input.city || !input.state || !input.zipCode || !input.contactEmail) {
    throw new Error('Missing required fields');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.contactEmail)) {
    throw new Error('Invalid email format');
  }

  // Validate phone format (basic validation)
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  if (input.contactPhone && !phoneRegex.test(input.contactPhone)) {
    throw new Error('Invalid phone format');
  }

  // Generate unique ID
  const propertyId = ulid();
  const now = new Date().toISOString();

  // Determine submittedBy based on authentication
  let submittedBy: string | undefined;
  if (identity && 'username' in identity) {
    // Cognito authenticated user
    submittedBy = identity.username;
  } else if (identity && 'userArn' in identity) {
    // IAM authenticated user
    submittedBy = identity.userArn;
  }

  // Create property object
  const property: Property = {
    id: propertyId,
    ...input,
    submittedBy,
    submittedAt: now,
    updatedAt: now,
    status: 'PENDING_REVIEW', // All new properties start as pending review
    isPublic: true, // Public submissions are always public
  };

  // Add GSI attributes for querying
  const dynamoItem = {
    ...property,
    pk: `PROPERTY#${propertyId}`,
    sk: `PROPERTY#${propertyId}`,
    // GSI1: Query by status
    gsi1pk: `STATUS#${property.status}`,
    gsi1sk: `SUBMITTED#${property.submittedAt}`,
    // GSI2: Query by city/state
    gsi2pk: `LOCATION#${property.state}#${property.city}`,
    gsi2sk: `PRICE#${property.price.toString().padStart(10, '0')}`,
    // GSI3: Query by property type
    gsi3pk: `TYPE#${property.propertyType}`,
    gsi3sk: `SUBMITTED#${property.submittedAt}`,
    // GSI4: Query by listing type
    gsi4pk: `LISTING#${property.listingType}`,
    gsi4sk: `PRICE#${property.price.toString().padStart(10, '0')}`,
    // GSI5: Query by submittedBy (if authenticated)
    ...(submittedBy && {
      gsi5pk: `USER#${submittedBy}`,
      gsi5sk: `SUBMITTED#${property.submittedAt}`,
    }),
  };

  try {
    // Save to DynamoDB
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: dynamoItem,
      ConditionExpression: 'attribute_not_exists(pk)', // Ensure uniqueness
    }));

    console.log('Property created successfully:', propertyId);
    return property;
  } catch (error) {
    console.error('Error creating property:', error);
    throw new Error('Failed to create property');
  }
};