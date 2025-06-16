import { AppSyncResolverEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = process.env.TABLE_NAME!;

interface PropertyFilter {
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  bedrooms?: number;
  status?: string;
}

interface ListPropertiesArgs {
  filter?: PropertyFilter;
  limit?: number;
  nextToken?: string;
}

interface PropertyConnection {
  items: any[];
  nextToken?: string;
}

export const handler = async (
  event: AppSyncResolverEvent<ListPropertiesArgs>
): Promise<PropertyConnection> => {
  console.log('ListProperties event:', JSON.stringify(event, null, 2));

  const { filter, limit = 20, nextToken } = event.arguments;

  // Build filter expression
  const filterExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  // Only show approved properties to public
  filterExpressions.push('#status = :status');
  expressionAttributeNames['#status'] = 'status';
  expressionAttributeValues[':status'] = 'APPROVED';

  if (filter) {
    if (filter.city) {
      filterExpressions.push('#city = :city');
      expressionAttributeNames['#city'] = 'city';
      expressionAttributeValues[':city'] = filter.city;
    }

    if (filter.state) {
      filterExpressions.push('#state = :state');
      expressionAttributeNames['#state'] = 'state';
      expressionAttributeValues[':state'] = filter.state;
    }

    if (filter.minPrice !== undefined) {
      filterExpressions.push('#price >= :minPrice');
      expressionAttributeNames['#price'] = 'price';
      expressionAttributeValues[':minPrice'] = filter.minPrice;
    }

    if (filter.maxPrice !== undefined) {
      filterExpressions.push('#price <= :maxPrice');
      expressionAttributeNames['#price'] = 'price';
      expressionAttributeValues[':maxPrice'] = filter.maxPrice;
    }

    if (filter.propertyType) {
      filterExpressions.push('#propertyType = :propertyType');
      expressionAttributeNames['#propertyType'] = 'propertyType';
      expressionAttributeValues[':propertyType'] = filter.propertyType;
    }

    if (filter.bedrooms !== undefined) {
      filterExpressions.push('#bedrooms >= :bedrooms');
      expressionAttributeNames['#bedrooms'] = 'bedrooms';
      expressionAttributeValues[':bedrooms'] = filter.bedrooms;
    }
  }

  const params: ScanCommandInput = {
    TableName: TABLE_NAME,
    Limit: limit,
  };

  if (filterExpressions.length > 0) {
    params.FilterExpression = filterExpressions.join(' AND ');
    params.ExpressionAttributeNames = expressionAttributeNames;
    params.ExpressionAttributeValues = expressionAttributeValues;
  }

  if (nextToken) {
    params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
  }

  try {
    const result = await docClient.send(new ScanCommand(params));

    const response: PropertyConnection = {
      items: result.Items || [],
    };

    if (result.LastEvaluatedKey) {
      response.nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    console.log(`Returned ${response.items.length} properties`);

    return response;
  } catch (error) {
    console.error('Error listing properties:', error);
    throw new Error('Failed to list properties');
  }
};