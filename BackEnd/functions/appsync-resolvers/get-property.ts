import { AppSyncResolverHandler, AppSyncIdentityCognito, AppSyncIdentityIAM } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});
const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME!;
const USER_FILES_BUCKET = process.env.USER_FILES_BUCKET_NAME!;

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

export const handler: AppSyncResolverHandler<{ id: string }, Property | null> = async (event) => {
  console.log('GetProperty event:', JSON.stringify(event, null, 2));

  const { id } = event.arguments;

  if (!id) {
    throw new Error('Property ID is required');
  }

  try {
    // Get property from DynamoDB
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `PROPERTY#${id}`,
        sk: `PROPERTY#${id}`,
      },
    }));

    if (!result.Item) {
      return null;
    }

    // Remove DynamoDB-specific attributes
    const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, gsi3pk, gsi3sk, gsi4pk, gsi4sk, gsi5pk, gsi5sk, ...property } = result.Item;

    // Check if property is public or user has access
    const identity = event.identity as AppSyncIdentityCognito | AppSyncIdentityIAM | null | undefined;
    const isAuthenticated = identity && ('username' in identity || 'userArn' in identity);
    
    // If property is not public and not active, only show to authenticated users who own it or admins
    if (property.status !== 'ACTIVE' && !property.isPublic) {
      if (!isAuthenticated) {
        return null; // Don't expose non-active properties to public
      }
      
      // Check if user owns the property or is admin
      let username: string | undefined;
      let isAdmin = false;
      
      if (identity && 'username' in identity) {
        // Cognito user
        const cognitoIdentity = identity as AppSyncIdentityCognito;
        username = cognitoIdentity.username;
        isAdmin = cognitoIdentity.groups ? cognitoIdentity.groups.includes('admin') : false;
      } else if (identity && 'userArn' in identity) {
        // IAM user
        const iamIdentity = identity as AppSyncIdentityIAM;
        username = iamIdentity.userArn;
      }
      
      if (property.submittedBy !== username && !isAdmin) {
        return null; // User doesn't have access to this property
      }
    }

    return property as Property;
  } catch (error) {
    console.error('Error getting property:', error);
    throw new Error('Failed to get property');
  }
};