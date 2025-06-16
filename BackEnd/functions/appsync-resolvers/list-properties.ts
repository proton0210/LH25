import { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME!;

interface PropertyFilterInput {
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  propertyType?: string;
  listingType?: string;
  status?: string;
}

interface ListPropertiesArgs {
  filter?: PropertyFilterInput;
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

export const handler: AppSyncResolverHandler<ListPropertiesArgs, PropertyConnection> = async (event) => {
  console.log('ListProperties event:', JSON.stringify(event, null, 2));

  const { filter = {}, limit = 20, nextToken } = event.arguments;
  const maxLimit = Math.min(limit, 100); // Cap at 100 items

  try {
    let queryParams: any = {
      TableName: TABLE_NAME,
      Limit: maxLimit,
    };

    // Add pagination token if provided
    if (nextToken) {
      queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
    }

    // Determine which index to use based on filters
    if (filter.state && filter.city) {
      // Use GSI2 for location-based queries
      queryParams.IndexName = 'gsi2';
      queryParams.KeyConditionExpression = 'gsi2pk = :pk';
      queryParams.ExpressionAttributeValues = {
        ':pk': `LOCATION#${filter.state}#${filter.city}`,
      };
    } else if (filter.propertyType) {
      // Use GSI3 for property type queries
      queryParams.IndexName = 'gsi3';
      queryParams.KeyConditionExpression = 'gsi3pk = :pk';
      queryParams.ExpressionAttributeValues = {
        ':pk': `TYPE#${filter.propertyType}`,
      };
    } else if (filter.listingType) {
      // Use GSI4 for listing type queries
      queryParams.IndexName = 'gsi4';
      queryParams.KeyConditionExpression = 'gsi4pk = :pk';
      queryParams.ExpressionAttributeValues = {
        ':pk': `LISTING#${filter.listingType}`,
      };
    } else {
      // Default to querying by status (active properties)
      queryParams.IndexName = 'gsi1';
      queryParams.KeyConditionExpression = 'gsi1pk = :pk';
      queryParams.ExpressionAttributeValues = {
        ':pk': `STATUS#${filter.status || 'ACTIVE'}`,
      };
    }

    // Build filter expression for additional filters
    const filterExpressions: string[] = [];
    const expressionAttributeNames: any = {};
    const additionalValues: any = {};

    // Only show public active properties to unauthenticated users
    const identity = event.identity;
    const isAuthenticated = identity && ('username' in identity || 'userArn' in identity);
    
    if (!isAuthenticated) {
      filterExpressions.push('#status = :activeStatus AND #isPublic = :true');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeNames['#isPublic'] = 'isPublic';
      additionalValues[':activeStatus'] = 'ACTIVE';
      additionalValues[':true'] = true;
    }

    // Price filters
    if (filter.minPrice !== undefined) {
      filterExpressions.push('#price >= :minPrice');
      expressionAttributeNames['#price'] = 'price';
      additionalValues[':minPrice'] = filter.minPrice;
    }
    if (filter.maxPrice !== undefined) {
      filterExpressions.push('#price <= :maxPrice');
      expressionAttributeNames['#price'] = 'price';
      additionalValues[':maxPrice'] = filter.maxPrice;
    }

    // Bedroom/bathroom filters
    if (filter.minBedrooms !== undefined) {
      filterExpressions.push('#bedrooms >= :minBedrooms');
      expressionAttributeNames['#bedrooms'] = 'bedrooms';
      additionalValues[':minBedrooms'] = filter.minBedrooms;
    }
    if (filter.minBathrooms !== undefined) {
      filterExpressions.push('#bathrooms >= :minBathrooms');
      expressionAttributeNames['#bathrooms'] = 'bathrooms';
      additionalValues[':minBathrooms'] = filter.minBathrooms;
    }

    // Apply filter expression if any filters were added
    if (filterExpressions.length > 0) {
      queryParams.FilterExpression = filterExpressions.join(' AND ');
      queryParams.ExpressionAttributeNames = expressionAttributeNames;
      queryParams.ExpressionAttributeValues = {
        ...queryParams.ExpressionAttributeValues,
        ...additionalValues,
      };
    }

    // Execute query
    const result = await docClient.send(new QueryCommand(queryParams));

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
    console.error('Error listing properties:', error);
    throw new Error('Failed to list properties');
  }
};