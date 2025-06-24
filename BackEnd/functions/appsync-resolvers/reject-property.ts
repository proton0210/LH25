import { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const eventBridgeClient = new EventBridgeClient({});
const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME!;
const EVENT_BUS_NAME = process.env.ADMIN_EVENT_BUS_NAME!;

interface RejectPropertyArgs {
  id: string;
  reason: string;
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

export const handler: AppSyncResolverHandler<RejectPropertyArgs, Property> = async (event) => {
  console.log('RejectProperty event:', JSON.stringify(event, null, 2));

  const { id, reason } = event.arguments;
  const identity = event.identity as any;

  if (!id || !reason) {
    throw new Error('Property ID and rejection reason are required');
  }

  // Verify admin access
  const isAdmin = identity.groups && identity.groups.includes('admin');
  if (!isAdmin) {
    throw new Error('Only administrators can reject properties');
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

    if (getResult.Item.status === 'REJECTED') {
      throw new Error('Property is already rejected');
    }

    const now = new Date().toISOString();
    const rejectedBy = identity.username || identity.userArn;

    // Update property status to REJECTED
    const updateResult = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `PROPERTY#${id}`,
        sk: `PROPERTY#${id}`,
      },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt, #rejectedAt = :rejectedAt, #rejectedBy = :rejectedBy, #rejectionReason = :reason, #gsi1pk = :gsi1pk, #gsi1sk = :gsi1sk, #isPublic = :isPublic',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
        '#rejectedAt': 'rejectedAt',
        '#rejectedBy': 'rejectedBy',
        '#rejectionReason': 'rejectionReason',
        '#gsi1pk': 'gsi1pk',
        '#gsi1sk': 'gsi1sk',
        '#isPublic': 'isPublic',
      },
      ExpressionAttributeValues: {
        ':status': 'REJECTED',
        ':updatedAt': now,
        ':rejectedAt': now,
        ':rejectedBy': rejectedBy,
        ':reason': reason,
        ':gsi1pk': 'STATUS#REJECTED',
        ':gsi1sk': `SUBMITTED#${getResult.Item.submittedAt}`,
        ':isPublic': false, // Make rejected properties private
      },
      ReturnValues: 'ALL_NEW',
    }));

    // Clean up the property object
    const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, gsi3pk, gsi3sk, gsi4pk, gsi4sk, gsi5pk, gsi5sk, ...property } = updateResult.Attributes!;
    
    // Publish event to EventBridge
    try {
      const eventDetail = {
        propertyId: id,
        rejectedBy: rejectedBy,
        rejectedAt: now,
        rejectionReason: reason,
        property: property,
        submittedBy: getResult.Item.submittedBy,
        userEmail: property.contactEmail,
        userName: property.contactName,
      };

      const putEventsCommand = new PutEventsCommand({
        Entries: [
          {
            Source: 'lh.admin',
            DetailType: 'Property Rejected',
            Detail: JSON.stringify(eventDetail),
            EventBusName: EVENT_BUS_NAME,
          },
        ],
      });

      await eventBridgeClient.send(putEventsCommand);
      console.log('Property rejection event published to EventBridge');
    } catch (eventError) {
      console.error('Error publishing event to EventBridge:', eventError);
      // Don't throw error - event publishing failure shouldn't prevent property rejection
    }
    
    console.log('Property rejected successfully:', id);
    return property as Property;
  } catch (error) {
    console.error('Error rejecting property:', error);
    throw error;
  }
};