import { AppSyncResolverHandler, AppSyncIdentityCognito } from "aws-lambda";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

interface ListMyReportsArgs {
  limit?: number;
  nextToken?: string;
}

interface UserReport {
  reportId: string;
  fileName: string;
  reportType: string;
  propertyTitle: string;
  createdAt: string;
  size: number;
  signedUrl: string;
  s3Key: string;
}

interface ReportConnection {
  items: UserReport[];
  nextToken?: string;
}

export const handler: AppSyncResolverHandler<ListMyReportsArgs, ReportConnection> = async (event) => {
  console.log("Listing reports for user:", JSON.stringify(event, null, 2));
  
  const cognitoIdentity = event.identity as AppSyncIdentityCognito;
  const cognitoUserId = cognitoIdentity?.username || cognitoIdentity?.sub;
  const limit = event.arguments.limit || 20;
  const nextToken = event.arguments.nextToken;
  
  const bucketName = process.env.USER_FILES_BUCKET_NAME;
  const userTableName = process.env.USER_TABLE_NAME;
  
  if (!bucketName || !userTableName) {
    throw new Error("Required environment variables are not set");
  }
  
  try {
    // First, get the actual userId from cognitoUserId
    let userId = cognitoUserId;
    
    if (cognitoUserId && cognitoUserId !== "anonymous") {
      const queryCommand = new QueryCommand({
        TableName: userTableName,
        IndexName: "cognitoUserId",
        KeyConditionExpression: "cognitoUserId = :cognitoUserId",
        ExpressionAttributeValues: {
          ":cognitoUserId": cognitoUserId
        }
      });
      
      const queryResult = await docClient.send(queryCommand);
      
      if (queryResult.Items && queryResult.Items.length > 0) {
        userId = queryResult.Items[0].userId;
      }
    }
    
    // List objects in the user's reports folder
    const prefix = `${userId}/reports/`;
    
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      MaxKeys: limit,
      ContinuationToken: nextToken
    });
    
    const listResult = await s3Client.send(listCommand);
    
    if (!listResult.Contents || listResult.Contents.length === 0) {
      return {
        items: [],
        nextToken: undefined
      };
    }
    
    // Parse the file names to extract report metadata
    const items = await Promise.all(
      listResult.Contents.map(async (object) => {
        if (!object.Key || !object.LastModified || !object.Size) {
          return null;
        }
        
        const fileName = object.Key.split('/').pop() || '';
        
        // Parse filename format: YYYY-MM-DD_reportType_propertyTitle_reportId.pdf
        const fileNameParts = fileName.replace('.pdf', '').split('_');
        
        let reportType = 'CUSTOM';
        let propertyTitle = 'Unknown Property';
        let reportId = '';
        
        if (fileNameParts.length >= 4) {
          // Date is first part (YYYY-MM-DD)
          reportType = fileNameParts[1]?.toUpperCase() || 'CUSTOM';
          // Property title might have underscores, so join middle parts
          propertyTitle = fileNameParts.slice(2, -1).join(' ').replace(/_/g, ' ');
          reportId = fileNameParts[fileNameParts.length - 1];
        }
        
        // Generate pre-signed URL for download
        const getObjectCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: object.Key
        });
        
        const signedUrl = await getSignedUrl(s3Client, getObjectCommand, {
          expiresIn: 3600 // 1 hour
        });
        
        return {
          reportId: reportId || object.ETag?.replace(/"/g, '') || '',
          fileName: fileName,
          reportType: reportType,
          propertyTitle: propertyTitle,
          createdAt: object.LastModified.toISOString(),
          size: object.Size,
          signedUrl: signedUrl,
          s3Key: object.Key
        };
      })
    );
    
    // Filter out any null items
    const validItems = items.filter((item): item is UserReport => item !== null);
    
    // Sort by created date (newest first)
    validItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return {
      items: validItems,
      nextToken: listResult.NextContinuationToken
    };
    
  } catch (error) {
    console.error("Error listing user reports:", error);
    throw new Error("Unable to retrieve reports");
  }
};