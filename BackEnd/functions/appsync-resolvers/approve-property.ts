import { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME!;

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

export const handler: AppSyncResolverHandler<{ id: string }, Property> = async (event) => {
  console.log('ApproveProperty event:', JSON.stringify(event, null, 2));

  const { id } = event.arguments;
  const identity = event.identity as any;

  if (!id) {
    throw new Error('Property ID is required');
  }

  // Verify admin access
  const isAdmin = identity.groups && identity.groups.includes('admin');
  if (!isAdmin) {
    throw new Error('Only administrators can approve properties');
  }

  try {
    // First, get the existing property
    const getResult = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `PROPERTY#${id}`,
        sk: `PROPERTY#${id}`,
      },
    }));

    if (!getResult.Item) {
      throw new Error('Property not found');
    }

    if (getResult.Item.status === 'ACTIVE') {
      throw new Error('Property is already approved');
    }

    const now = new Date().toISOString();
    const approvedBy = identity.username || identity.userArn;

    // Update property status to ACTIVE
    const updateResult = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `PROPERTY#${id}`,
        sk: `PROPERTY#${id}`,
      },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt, #approvedAt = :approvedAt, #approvedBy = :approvedBy, #gsi1pk = :gsi1pk, #gsi1sk = :gsi1sk',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
        '#approvedAt': 'approvedAt',
        '#approvedBy': 'approvedBy',
        '#gsi1pk': 'gsi1pk',
        '#gsi1sk': 'gsi1sk',
      },
      ExpressionAttributeValues: {
        ':status': 'ACTIVE',
        ':updatedAt': now,
        ':approvedAt': now,
        ':approvedBy': approvedBy,
        ':gsi1pk': 'STATUS#ACTIVE',
        ':gsi1sk': `SUBMITTED#${getResult.Item.submittedAt}`,
      },
      ReturnValues: 'ALL_NEW',
    }));

    // Clean up and return
    const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, gsi3pk, gsi3sk, gsi4pk, gsi4sk, gsi5pk, gsi5sk, ...property } = updateResult.Attributes!;
    
    console.log('Property approved successfully:', id);
    return property as Property;
  } catch (error) {
    console.error('Error approving property:', error);
    throw error;
  }
};