import { AppSyncResolverHandler, AppSyncIdentityCognito } from "aws-lambda";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { randomUUID } from "crypto";

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const sfnClient = new SFNClient({});
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

const generatePrompt = (input: GenerateReportInput): string => {
  const amenitiesText = input.amenities?.length ? `Amenities: ${input.amenities.join(", ")}` : "";
  const yearBuiltText = input.yearBuilt ? `Year Built: ${input.yearBuilt}` : "";
  const lotSizeText = input.lotSize ? `Lot Size: ${input.lotSize} acres` : "";
  
  const basePrompt = `You are a professional real estate analyst. Generate a comprehensive ${input.reportType.replace(/_/g, " ")} report for the following property:

Property Title: ${input.title}
Description: ${input.description}
Price: $${input.price.toLocaleString()}
Address: ${input.address}, ${input.city}, ${input.state} ${input.zipCode}
Property Type: ${input.propertyType.replace(/_/g, " ")}
Listing Type: ${input.listingType === "FOR_SALE" ? "For Sale" : "For Rent"}
Bedrooms: ${input.bedrooms}
Bathrooms: ${input.bathrooms}
Square Feet: ${input.squareFeet.toLocaleString()}
${yearBuiltText}
${lotSizeText}
${amenitiesText}

Additional Context: ${input.additionalContext || "None provided"}`;

  const reportInstructions = {
    MARKET_ANALYSIS: `
Create a detailed market analysis report that includes:
1. Executive Summary (2-3 sentences)
2. Local Market Overview
3. Comparable Properties Analysis
4. Price Positioning Assessment
5. Market Trends and Forecast
6. Recommendations for Pricing Strategy

Format the response with clear sections and bullet points where appropriate.`,
    
    INVESTMENT_ANALYSIS: `
Create a comprehensive investment analysis report that includes:
1. Executive Summary (2-3 sentences)
2. ROI Projections
3. Cash Flow Analysis
4. Risk Assessment
5. Market Growth Potential
6. Investment Recommendations

Include specific metrics and financial projections where relevant.`,
    
    COMPARATIVE_MARKET_ANALYSIS: `
Create a detailed comparative market analysis (CMA) that includes:
1. Executive Summary (2-3 sentences)
2. Subject Property Analysis
3. Comparable Properties (suggest 3-5 similar properties)
4. Market Adjustments
5. Final Value Opinion
6. Marketing Recommendations

Provide specific price ranges and adjustment factors.`,
    
    LISTING_OPTIMIZATION: `
Create a listing optimization report that includes:
1. Executive Summary (2-3 sentences)
2. Listing Strengths and Weaknesses
3. Pricing Recommendations
4. Marketing Strategy Suggestions
5. Staging and Presentation Tips
6. Target Buyer Profile

Focus on actionable recommendations to improve listing performance.`,
    
    CUSTOM: `
Create a comprehensive property analysis report that includes:
1. Executive Summary (2-3 sentences)
2. Property Overview
3. Market Context
4. Value Assessment
5. Opportunities and Challenges
6. Strategic Recommendations

Provide a balanced analysis suitable for general purposes.`
  };

  return basePrompt + (reportInstructions[input.reportType as keyof typeof reportInstructions] || reportInstructions.CUSTOM);
};

const parseReportContent = (content: string): { executiveSummary?: string; marketInsights?: string; recommendations?: string } => {
  const sections: { executiveSummary?: string; marketInsights?: string; recommendations?: string } = {};
  
  // Extract Executive Summary
  const summaryMatch = content.match(/executive summary[:\s]*([\s\S]*?)(?=\n\n|\d\.|$)/i);
  if (summaryMatch) {
    sections.executiveSummary = summaryMatch[1].trim();
  }
  
  // Extract Market Insights (from various sections)
  const marketMatch = content.match(/(?:market|trends?|analysis)[:\s]*([\s\S]*?)(?=\n\n|\d\.|recommendations|$)/i);
  if (marketMatch) {
    sections.marketInsights = marketMatch[1].trim();
  }
  
  // Extract Recommendations
  const recsMatch = content.match(/recommendations?[:\s]*([\s\S]*?)(?=\n\n|$)/i);
  if (recsMatch) {
    sections.recommendations = recsMatch[1].trim();
  }
  
  return sections;
};

export const handler: AppSyncResolverHandler<{ input: GenerateReportInput }, PropertyReport> = async (event) => {
  console.log("Event received:", JSON.stringify(event, null, 2));
  
  const { input } = event.arguments;
  const startTime = Date.now();
  const reportId = randomUUID();
  const stateMachineArn = process.env.REPORT_GENERATION_STATE_MACHINE_ARN;
  const aiProcessingQueueUrl = process.env.AI_PROCESSING_QUEUE_URL;
  const cognitoIdentity = event.identity as AppSyncIdentityCognito;
  const userId = cognitoIdentity?.sub || cognitoIdentity?.username || "anonymous";
  
  try {
    // If SQS queue is configured, use async processing
    if (aiProcessingQueueUrl) {
      const messageBody = {
        reportId,
        userId,
        propertyId: `${input.address}-${Date.now()}`, // Generate a unique property ID
        propertyData: input,
        reportType: input.reportType,
        timestamp: new Date().toISOString()
      };

      const sendMessageCommand = new SendMessageCommand({
        QueueUrl: aiProcessingQueueUrl,
        MessageBody: JSON.stringify(messageBody),
        MessageAttributes: {
          reportType: {
            DataType: "String",
            StringValue: input.reportType
          },
          userId: {
            DataType: "String",
            StringValue: userId
          }
        }
      });

      await sqsClient.send(sendMessageCommand);
      console.log(`Sent AI processing message to queue for report: ${reportId}`);

      // Return immediate response while processing happens asynchronously
      return {
        reportId,
        reportType: input.reportType,
        generatedAt: new Date().toISOString(),
        content: "Report generation initiated. The PDF will be available in your Reports folder shortly.",
        propertyTitle: input.title,
        executiveSummary: "Report is being generated...",
        metadata: {
          modelUsed: "apac.anthropic.claude-3-haiku-20240307-v1:0",
          generationTimeMs: Date.now() - startTime,
          wordCount: 0
        }
      };
    }
    
    // Fallback to Step Functions if SQS is not configured
    if (stateMachineArn) {
      const executionName = `report-${reportId}-${Date.now()}`;
      
      const startExecutionCommand = new StartExecutionCommand({
        stateMachineArn: stateMachineArn,
        name: executionName,
        input: JSON.stringify({
          reportId,
          userId,
          cognitoUserId: input.cognitoUserId || cognitoIdentity?.username,
          input
        })
      });
      
      const sfnResponse = await sfnClient.send(startExecutionCommand);
      console.log(`Started report generation workflow: ${sfnResponse.executionArn}`);
      
      // Return immediate response while PDF generation happens asynchronously
      return {
        reportId,
        reportType: input.reportType,
        generatedAt: new Date().toISOString(),
        content: "Report generation initiated. The PDF will be available in your Reports folder shortly.",
        propertyTitle: input.title,
        executiveSummary: "Report is being generated...",
        metadata: {
          modelUsed: "apac.anthropic.claude-3-haiku-20240307-v1:0",
          generationTimeMs: Date.now() - startTime,
          wordCount: 0
        },
        executionArn: sfnResponse.executionArn
      };
    }
    
    // Original synchronous flow (kept for backward compatibility)
    // Prepare the prompt
    const prompt = generatePrompt(input);
    
    // Use Claude 3 Haiku model with APAC inference profile
    const modelId = "apac.anthropic.claude-3-haiku-20240307-v1:0";
    
    // Create the conversation
    const conversation = [
      {
        role: "user" as const,
        content: [{ text: prompt }]
      }
    ];
    
    // Create command with the Converse API
    const command = new ConverseCommand({
      modelId,
      messages: conversation,
      inferenceConfig: { 
        maxTokens: 2000, 
        temperature: 0.7, 
        topP: 0.9 
      }
    });
    
    console.log("Invoking Bedrock with model:", modelId);
    
    // Send the command to the model
    const response = await bedrockClient.send(command);
    console.log("Bedrock response received");
    
    // Extract the generated content
    const content = response.output?.message?.content?.[0]?.text || "No content generated";
    const generationTimeMs = Date.now() - startTime;
    const wordCount = content.split(/\s+/).length;
    
    // Parse sections from the content
    const parsedSections = parseReportContent(content);
    
    // Create the report object
    const report: PropertyReport = {
      reportId,
      reportType: input.reportType,
      generatedAt: new Date().toISOString(),
      content,
      propertyTitle: input.title,
      executiveSummary: parsedSections.executiveSummary,
      marketInsights: parsedSections.marketInsights,
      recommendations: parsedSections.recommendations,
      metadata: {
        modelUsed: modelId,
        generationTimeMs,
        wordCount
      }
    };
    
    return report;
    
  } catch (error) {
    console.error("Error generating property report:", error);
    
    // Return a fallback response
    return {
      reportId,
      reportType: input.reportType,
      generatedAt: new Date().toISOString(),
      content: "Unable to generate report at this time. Please try again later.",
      propertyTitle: input.title,
      metadata: {
        modelUsed: "apac.anthropic.claude-3-haiku-20240307-v1:0",
        generationTimeMs: Date.now() - startTime,
        wordCount: 0
      }
    };
  }
};