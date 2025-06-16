import { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME!;
const IMAGES_BUCKET_NAME = process.env.PROPERTY_IMAGES_BUCKET_NAME!;

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
  console.log('DeleteProperty event:', JSON.stringify(event, null, 2));

  const { id } = event.arguments;
  const identity = event.identity as any;

  if (!id) {
    throw new Error('Property ID is required');
  }

  // Get current user
  const currentUser = identity.username || identity.userArn;
  const isAdmin = identity.groups && identity.groups.includes('admin');

  try {
    // First, get the existing property to check ownership and get image keys
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

    // Check if user has permission to delete
    if (!isAdmin && getResult.Item.submittedBy !== currentUser) {
      throw new Error('You do not have permission to delete this property');
    }

    // Delete associated images from S3
    if (getResult.Item.images && getResult.Item.images.length > 0) {
      try {
        const objectsToDelete = getResult.Item.images.map((imageKey: string) => ({
          Key: imageKey,
        }));

        await s3Client.send(new DeleteObjectsCommand({
          Bucket: IMAGES_BUCKET_NAME,
          Delete: {
            Objects: objectsToDelete,
            Quiet: true,
          },
        }));

        console.log(`Deleted ${objectsToDelete.length} images from S3`);
      } catch (s3Error) {
        console.error('Error deleting images from S3:', s3Error);
        // Continue with property deletion even if image deletion fails
      }
    }

    // Delete from DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `PROPERTY#${id}`,
        sk: `PROPERTY#${id}`,
      },
    }));

    // Clean up and return the deleted property
    const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, gsi3pk, gsi3sk, gsi4pk, gsi4sk, gsi5pk, gsi5sk, ...property } = getResult.Item;
    
    console.log('Property deleted successfully:', id);
    return property as Property;
  } catch (error) {
    console.error('Error deleting property:', error);
    throw error;
  }
};