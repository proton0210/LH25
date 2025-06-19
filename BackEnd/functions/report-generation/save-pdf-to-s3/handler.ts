import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export interface SavePDFToS3Input {
  reportId: string;
  userId: string;
  cognitoUserId?: string;
  input: {
    title: string;
    reportType: string;
    propertyType: string;
    city: string;
    state: string;
  };
  pdfBuffer: string; // Base64 encoded PDF
  generationTimeMs: number;
}

export const handler = async (event: SavePDFToS3Input): Promise<SavePDFToS3Input & { 
  s3Key: string;
  s3Url: string;
  signedUrl: string;
}> => {
  console.log("Saving PDF to S3 for report:", event.reportId);
  
  const bucketName = process.env.USER_FILES_BUCKET_NAME;
  const userTableName = process.env.USER_TABLE_NAME;
  
  if (!bucketName) {
    throw new Error("USER_FILES_BUCKET_NAME environment variable is not set");
  }
  
  if (!userTableName) {
    throw new Error("USER_TABLE_NAME environment variable is not set");
  }
  
  try {
    let userFolderPrefix = event.userId;
    
    // If we have cognitoUserId, try to get the actual userId
    if (event.cognitoUserId && event.cognitoUserId !== "anonymous") {
      try {
        const queryCommand = new QueryCommand({
          TableName: userTableName,
          IndexName: "cognitoUserId",
          KeyConditionExpression: "cognitoUserId = :cognitoUserId",
          ExpressionAttributeValues: {
            ":cognitoUserId": event.cognitoUserId
          }
        });
        
        const queryResult = await docClient.send(queryCommand);
        
        if (queryResult.Items && queryResult.Items.length > 0) {
          userFolderPrefix = queryResult.Items[0].userId;
        }
      } catch (error) {
        console.warn("Could not fetch userId from cognitoUserId:", error);
      }
    }
    
    // Create a clean filename
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const cleanTitle = event.input.title.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    const reportTypeShort = event.input.reportType.split('_')[0].toLowerCase();
    const filename = `${timestamp}_${reportTypeShort}_${cleanTitle}_${event.reportId}.pdf`;
    
    // S3 key structure: userId/reports/filename
    const s3Key = `${userFolderPrefix}/reports/${filename}`;
    
    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(event.pdfBuffer, 'base64');
    
    // Upload to S3
    const putObjectCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ContentDisposition: `inline; filename="${filename}"`,
      Metadata: {
        reportId: event.reportId,
        reportType: event.input.reportType,
        propertyTitle: event.input.title,
        generatedAt: new Date().toISOString(),
        generationTimeMs: event.generationTimeMs.toString()
      }
    });
    
    await s3Client.send(putObjectCommand);
    
    console.log(`PDF saved to S3: s3://${bucketName}/${s3Key}`);
    
    // Generate S3 URL (note: this is not a public URL, requires authentication)
    const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    
    // Generate pre-signed URL valid for 1 hour
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key
    });
    
    const signedUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: 3600 // 1 hour in seconds
    });
    
    console.log(`Generated pre-signed URL valid for 1 hour`);
    
    return {
      ...event,
      s3Key,
      s3Url,
      signedUrl
    };
    
  } catch (error) {
    console.error("Error saving PDF to S3:", error);
    throw error;
  }
};