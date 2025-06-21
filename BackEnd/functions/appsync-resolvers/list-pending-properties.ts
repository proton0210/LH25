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

interface ListPendingPropertiesArgs {
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

async function generateSignedUrlsForImages(images: string[]): Promise<string[]> {
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

export const handler: AppSyncResolverHandler<ListPendingPropertiesArgs, PropertyConnection> = async (event) => {
  console.log('ListPendingProperties event:', JSON.stringify(event, null, 2));

  const { limit = 20, nextToken } = event.arguments;
  const identity = event.identity as AppSyncIdentityCognito;
  const maxLimit = Math.min(limit, 100); // Cap at 100 items

  // Verify admin access
  const isAdmin = identity?.groups && identity.groups.includes('admin');
  if (!isAdmin) {
    throw new Error('Only administrators can list pending properties');
  }

  try {
    // Query properties with PENDING_REVIEW status using GSI1
    const queryParams: any = {
      TableName: TABLE_NAME,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: {
        ':pk': 'STATUS#PENDING_REVIEW',
      },
      ScanIndexForward: false, // Most recent first
      Limit: maxLimit,
    };

    // Add pagination token if provided
    if (nextToken) {
      queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
    }

    // Execute query
    const result = await docClient.send(new QueryCommand(queryParams));

    // Process items to include additional user information
    const items = await Promise.all(
      (result.Items || []).map(async (item) => {
        const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, gsi3pk, gsi3sk, gsi4pk, gsi4sk, gsi5pk, gsi5sk, ...property } = item;
        
        // Generate signed URLs for images
        if (property.images && Array.isArray(property.images)) {
          property.images = await generateSignedUrlsForImages(property.images);
        }
        
        // Optionally fetch submitter user details
        if (property.submittedBy) {
          try {
            const userQueryCommand = new QueryCommand({
              TableName: USER_TABLE_NAME,
              IndexName: "cognitoUserId",
              KeyConditionExpression: "cognitoUserId = :cognitoUserId",
              ExpressionAttributeValues: {
                ":cognitoUserId": property.submittedBy
              },
              Limit: 1
            });
            
            const userQueryResult = await docClient.send(userQueryCommand);
            
            if (userQueryResult.Items && userQueryResult.Items.length > 0) {
              const user = userQueryResult.Items[0];
              // Add submitter details to property
              property.submitterName = `${user.firstName} ${user.lastName}`;
              property.submitterEmail = user.email;
            }
          } catch (error) {
            console.error('Error fetching user details:', error);
            // Continue without user details
          }
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

    console.log(`Returning ${items.length} pending properties`);
    return response;
  } catch (error) {
    console.error('Error listing pending properties:', error);
    throw new Error('Failed to list pending properties');
  }
};