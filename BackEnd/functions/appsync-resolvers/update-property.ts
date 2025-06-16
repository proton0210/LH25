import { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME!;

interface UpdatePropertyInput {
  id: string;
  title?: string;
  description?: string;
  price?: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  propertyType?: string;
  listingType?: string;
  images?: string[];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  amenities?: string[];
  yearBuilt?: number;
  lotSize?: number;
  parkingSpaces?: number;
  status?: string;
}

interface Property {
  id: string;
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
  submittedBy?: string;
  submittedAt: string;
  updatedAt: string;
  status: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  amenities?: string[];
  yearBuilt?: number;
  lotSize?: number;
  parkingSpaces?: number;
  isPublic: boolean;
}

export const handler: AppSyncResolverHandler<{ input: UpdatePropertyInput }, Property> = async (event) => {
  console.log('UpdateProperty event:', JSON.stringify(event, null, 2));

  const { input } = event.arguments;
  const identity = event.identity as any;

  if (!input.id) {
    throw new Error('Property ID is required');
  }

  // Get current user
  const currentUser = identity.username || identity.userArn;
  const isAdmin = identity.groups && identity.groups.includes('admin');

  try {
    // First, get the existing property to check ownership
    const getResult = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `PROPERTY#${input.id}`,
        sk: `PROPERTY#${input.id}`,
      },
    }));

    if (!getResult.Item) {
      throw new Error('Property not found');
    }

    // Check if user has permission to update
    if (!isAdmin && getResult.Item.submittedBy !== currentUser) {
      throw new Error('You do not have permission to update this property');
    }

    // Build update expression
    const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
    const expressionAttributeNames: any = { '#updatedAt': 'updatedAt' };
    const expressionAttributeValues: any = { ':updatedAt': new Date().toISOString() };

    // Add each field to update
    Object.entries(input).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        // Validate status changes
        if (key === 'status' && !isAdmin) {
          throw new Error('Only admins can change property status');
        }

        const placeholder = `:${key}`;
        updateExpressions.push(`#${key} = ${placeholder}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[placeholder] = value;
      }
    });

    // Update GSI attributes if location or type changes
    if (input.state || input.city) {
      const state = input.state || getResult.Item.state;
      const city = input.city || getResult.Item.city;
      updateExpressions.push('#gsi2pk = :gsi2pk');
      expressionAttributeNames['#gsi2pk'] = 'gsi2pk';
      expressionAttributeValues[':gsi2pk'] = `LOCATION#${state}#${city}`;
    }

    if (input.price) {
      updateExpressions.push('#gsi2sk = :gsi2sk');
      expressionAttributeNames['#gsi2sk'] = 'gsi2sk';
      expressionAttributeValues[':gsi2sk'] = `PRICE#${input.price.toString().padStart(10, '0')}`;
      
      updateExpressions.push('#gsi4sk = :gsi4sk');
      expressionAttributeNames['#gsi4sk'] = 'gsi4sk';
      expressionAttributeValues[':gsi4sk'] = `PRICE#${input.price.toString().padStart(10, '0')}`;
    }

    if (input.propertyType) {
      updateExpressions.push('#gsi3pk = :gsi3pk');
      expressionAttributeNames['#gsi3pk'] = 'gsi3pk';
      expressionAttributeValues[':gsi3pk'] = `TYPE#${input.propertyType}`;
    }

    if (input.listingType) {
      updateExpressions.push('#gsi4pk = :gsi4pk');
      expressionAttributeNames['#gsi4pk'] = 'gsi4pk';
      expressionAttributeValues[':gsi4pk'] = `LISTING#${input.listingType}`;
    }

    if (input.status) {
      updateExpressions.push('#gsi1pk = :gsi1pk');
      expressionAttributeNames['#gsi1pk'] = 'gsi1pk';
      expressionAttributeValues[':gsi1pk'] = `STATUS#${input.status}`;
    }

    // Execute update
    const updateResult = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `PROPERTY#${input.id}`,
        sk: `PROPERTY#${input.id}`,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    // Clean up and return
    const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, gsi3pk, gsi3sk, gsi4pk, gsi4sk, gsi5pk, gsi5sk, ...property } = updateResult.Attributes!;
    
    return property as Property;
  } catch (error) {
    console.error('Error updating property:', error);
    throw error;
  }
};