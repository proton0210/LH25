import { AppSyncResolverHandler, AppSyncIdentityCognito } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});
const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME!;
const USER_FILES_BUCKET = process.env.USER_FILES_BUCKET_NAME!;
const USER_TABLE_NAME = process.env.USER_TABLE_NAME!;

interface ListMyPropertiesArgs {
  userId: string;
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

async function generateSignedUrlsForImages(images: string[], userId?: string): Promise<string[]> {
  const signedUrls: string[] = [];
  
  for (const image of images) {
    // Check if image is already a URL (external)
    if (image.startsWith('http://') || image.startsWith('https://')) {
      signedUrls.push(image);
    } else {
      // It's an S3 key, generate signed URL
      try {
        const command = new GetObjectCommand({
          Bucket: USER_FILES_BUCKET,
          Key: image
        });
        
        const signedUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 3600 // 1 hour
        });
        
        signedUrls.push(signedUrl);
      } catch (error) {
        console.error(`Error generating signed URL for ${image}:`, error);
        signedUrls.push(''); // Push empty string if error
      }
    }
  }
  
  return signedUrls;
}

export const handler: AppSyncResolverHandler<ListMyPropertiesArgs, PropertyConnection> = async (event) => {
  const { userId, limit = 20, nextToken } = event.arguments;
  const identity = event.identity as AppSyncIdentityCognito;
  const maxLimit = Math.min(limit, 100); // Cap at 100 items

  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    // First, query the Users table with userId as partition key to get the cognitoUserId
    const getUserCommand = new QueryCommand({
      TableName: USER_TABLE_NAME,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId
      },
      Limit: 1
    });
    
    const userResult = await docClient.send(getUserCommand);
    
    if (!userResult.Items || userResult.Items.length === 0) {
      throw new Error('User not found');
    }
    
    const user = userResult.Items[0];
    const cognitoUserId = user.cognitoUserId;

    let queryParams: any = {
      TableName: TABLE_NAME,
      Limit: maxLimit,
    };

    // Add pagination token if provided
    if (nextToken) {
      queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
    }

    // Query properties for this specific user using GSI5
    queryParams.IndexName = 'gsi5';
    queryParams.KeyConditionExpression = 'gsi5pk = :pk';
    queryParams.ExpressionAttributeValues = {
      ':pk': `USER#${cognitoUserId}`, // Use cognitoUserId to query properties
    };
    queryParams.ScanIndexForward = false; // Most recent first

    // Execute query
    const result = await docClient.send(new QueryCommand(queryParams));

    // Clean up items and generate signed URLs for images
    const items = await Promise.all(
      (result.Items || []).map(async (item, index) => {
        const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, gsi3pk, gsi3sk, gsi4pk, gsi4sk, gsi5pk, gsi5sk, ...property } = item;
        
        // Generate signed URLs for images
        if (property.images && Array.isArray(property.images)) {
          property.images = await generateSignedUrlsForImages(property.images, userId);
        }
        
        return property as Property;
      })
    );

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
    throw new Error(`Failed to list properties: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};