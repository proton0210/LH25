import { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME!;

interface ListMyPropertiesArgs {
  limit?: number;
  nextToken?: string;
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

interface PropertyConnection {
  items: Property[];
  nextToken?: string;
}

export const handler: AppSyncResolverHandler<ListMyPropertiesArgs, PropertyConnection> = async (event) => {
  console.log('ListMyProperties event:', JSON.stringify(event, null, 2));

  const { limit = 20, nextToken } = event.arguments;
  const identity = event.identity as any;
  const maxLimit = Math.min(limit, 100); // Cap at 100 items

  // Get current user
  const currentUser = identity.username || identity.userArn;
  const isAdmin = identity.groups && identity.groups.includes('admin');

  if (!currentUser) {
    throw new Error('User not authenticated');
  }

  try {
    let queryParams: any = {
      TableName: TABLE_NAME,
      Limit: maxLimit,
    };

    // Add pagination token if provided
    if (nextToken) {
      queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
    }

    if (isAdmin) {
      // Admins can see all properties
      queryParams.IndexName = 'gsi1';
      queryParams.KeyConditionExpression = 'gsi1pk = :pk';
      queryParams.ExpressionAttributeValues = {
        ':pk': 'STATUS#PENDING_REVIEW', // Show pending properties first for admins
      };
      queryParams.ScanIndexForward = false; // Most recent first
    } else {
      // Regular users see only their own properties
      queryParams.IndexName = 'gsi5';
      queryParams.KeyConditionExpression = 'gsi5pk = :pk';
      queryParams.ExpressionAttributeValues = {
        ':pk': `USER#${currentUser}`,
      };
      queryParams.ScanIndexForward = false; // Most recent first
    }

    // Execute query
    const result = await docClient.send(new QueryCommand(queryParams));

    // If admin and no pending properties, also get active properties
    if (isAdmin && (!result.Items || result.Items.length === 0)) {
      queryParams.ExpressionAttributeValues[':pk'] = 'STATUS#ACTIVE';
      const activeResult = await docClient.send(new QueryCommand(queryParams));
      result.Items = activeResult.Items;
      result.LastEvaluatedKey = activeResult.LastEvaluatedKey;
    }

    // Clean up items
    const items = (result.Items || []).map(item => {
      const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, gsi3pk, gsi3sk, gsi4pk, gsi4sk, gsi5pk, gsi5sk, ...property } = item;
      return property as Property;
    });

    // Prepare response
    const response: PropertyConnection = {
      items,
    };

    // Add pagination token if there are more results
    if (result.LastEvaluatedKey) {
      response.nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    return response;
  } catch (error) {
    console.error('Error listing my properties:', error);
    throw new Error('Failed to list properties');
  }
};