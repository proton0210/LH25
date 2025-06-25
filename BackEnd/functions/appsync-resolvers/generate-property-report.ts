import { AppSyncResolverHandler, AppSyncIdentityCognito } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { randomUUID } from "crypto";

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

interface GenerateReportInput {
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
  yearBuilt?: number;
  lotSize?: number;
  amenities?: string[];
  reportType: string;
  additionalContext?: string;
  includeDetailedAmenities?: boolean;
  cognitoUserId?: string;
}

interface PropertyReport {
  reportId: string;
  reportType: string;
  generatedAt: string;
  content: string;
  propertyTitle: string;
  executiveSummary?: string;
  marketInsights?: string;
  recommendations?: string;
  metadata: {
    modelUsed: string;
    generationTimeMs: number;
    wordCount?: number;
  };
  signedUrl?: string;
  s3Key?: string;
  executionArn?: string;
}

export const handler: AppSyncResolverHandler<{ input: GenerateReportInput }, PropertyReport> = async (event) => {
  console.log("Event received:", JSON.stringify(event, null, 2));
  
  const { input } = event.arguments;
  const identity = event.identity as AppSyncIdentityCognito;
  
  // Check if user is paid or admin
  const groups = identity?.groups || [];
  const hasPaidAccess = groups.includes('paid') || groups.includes('admin');
  
  if (!hasPaidAccess) {
    throw new Error('Property reports are only available for Pro users. Please upgrade your account.');
  }
  
  // Use provided cognitoUserId or get from identity
  const cognitoUserId = input.cognitoUserId || identity?.username || identity?.sub;
  const reportId = randomUUID();
  const queueUrl = process.env.AI_PROCESSING_QUEUE_URL;
  
  if (!queueUrl) {
    throw new Error('AI processing queue not configured');
  }
  
  try {
    // Prepare message for SQS
    const queueMessage = {
      reportId,
      userId: cognitoUserId,
      cognitoUserId,
      input
    };
    
    // Send message to SQS queue
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(queueMessage),
      MessageAttributes: {
        reportId: {
          DataType: 'String',
          StringValue: reportId
        },
        userId: {
          DataType: 'String',
          StringValue: cognitoUserId || 'anonymous'
        },
        reportType: {
          DataType: 'String',
          StringValue: input.reportType
        }
      }
    });
    
    const result = await sqsClient.send(command);
    console.log('Sent report generation message to queue:', result.MessageId);
    
    // Return immediately with a placeholder response
    return {
      reportId,
      reportType: input.reportType,
      generatedAt: new Date().toISOString(),
      content: "Your report is being generated. You will receive an email notification when it's ready.",
      propertyTitle: input.title,
      metadata: {
        modelUsed: "claude-3-haiku",
        generationTimeMs: 0,
        wordCount: 0
      },
      executionArn: result.MessageId // Use message ID as a reference
    };
    
  } catch (error) {
    console.error("Error sending report generation request to queue:", error);
    throw new Error('Failed to submit report generation request');
  }
};