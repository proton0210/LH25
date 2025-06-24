import { SQSHandler, SQSEvent } from 'aws-lambda';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

interface AIProcessingMessage {
  reportId: string;
  userId: string;
  propertyId: string;
  propertyData: any;
  reportType: string;
  timestamp: string;
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log('Processing AI messages:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const message: AIProcessingMessage = JSON.parse(record.body);
      console.log(`Processing AI report: ${message.reportId}`);

      // Update status to processing
      await updateReportStatus(message.reportId, message.userId, 'PROCESSING');

      // Generate AI content using Bedrock
      const aiContent = await generateAIContent(message);

      // Generate PDF from AI content
      const pdfBuffer = await generatePDF(aiContent, message);

      // Save PDF to S3
      const pdfUrl = await savePDFToS3(pdfBuffer, message);

      // Update report status to completed
      await updateReportStatus(message.reportId, message.userId, 'COMPLETED', pdfUrl);

      console.log(`Successfully processed report: ${message.reportId}`);
    } catch (error) {
      console.error('Error processing message:', error);
      throw error; // Let SQS handle retry
    }
  }
};

async function generateAIContent(message: AIProcessingMessage): Promise<any> {
  const { propertyData, reportType } = message;

  const systemPrompt = `You are a real estate AI assistant generating a ${reportType} report for a property.`;
  
  const userPrompt = `Generate a comprehensive ${reportType} report for the following property:
    ${JSON.stringify(propertyData, null, 2)}
    
    Include relevant market analysis, investment insights, and recommendations.`;

  const command = new ConverseCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    inferenceConfig: {
      maxTokens: 4000,
      temperature: 0.7,
    },
    messages: [
      {
        role: 'user',
        content: [{ text: userPrompt }],
      },
    ],
    system: [{ text: systemPrompt }],
  });

  const response = await bedrockClient.send(command);
  const content = response.output?.message?.content?.[0];
  
  if (!content || !('text' in content)) {
    throw new Error('Failed to generate AI content');
  }

  return {
    content: content.text,
    generatedAt: new Date().toISOString(),
    reportType,
  };
}

async function generatePDF(aiContent: any, message: AIProcessingMessage): Promise<Buffer> {
  // Simplified PDF generation - in production, use a proper PDF library
  const pdfContent = `
    Property Report
    ===============
    Report ID: ${message.reportId}
    Property ID: ${message.propertyId}
    Report Type: ${message.reportType}
    Generated: ${new Date().toISOString()}
    
    ${aiContent.content}
  `;

  return Buffer.from(pdfContent, 'utf-8');
}

async function savePDFToS3(pdfBuffer: Buffer, message: AIProcessingMessage): Promise<string> {
  const key = `users/${message.userId}/reports/${message.reportId}.pdf`;
  
  const command = new PutObjectCommand({
    Bucket: process.env.USER_FILES_BUCKET_NAME!,
    Key: key,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
    Metadata: {
      reportId: message.reportId,
      propertyId: message.propertyId,
      reportType: message.reportType,
    },
  });

  await s3Client.send(command);
  
  return `https://${process.env.USER_FILES_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

async function updateReportStatus(
  reportId: string,
  userId: string,
  status: string,
  pdfUrl?: string
): Promise<void> {
  const updateExpression = pdfUrl
    ? 'SET #status = :status, #pdfUrl = :pdfUrl, #updatedAt = :updatedAt'
    : 'SET #status = :status, #updatedAt = :updatedAt';

  const expressionAttributeValues: any = {
    ':status': { S: status },
    ':updatedAt': { S: new Date().toISOString() },
  };

  if (pdfUrl) {
    expressionAttributeValues[':pdfUrl'] = { S: pdfUrl };
  }

  const command = new UpdateItemCommand({
    TableName: process.env.PROPERTIES_TABLE_NAME!,
    Key: {
      pk: { S: `USER#${userId}` },
      sk: { S: `REPORT#${reportId}` },
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: {
      '#status': 'status',
      '#pdfUrl': 'pdfUrl',
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: expressionAttributeValues,
  });

  await dynamoClient.send(command);
}