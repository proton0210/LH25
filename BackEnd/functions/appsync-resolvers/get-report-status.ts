import { AppSyncResolverHandler, AppSyncIdentityCognito } from "aws-lambda";
import { SFNClient, DescribeExecutionCommand } from "@aws-sdk/client-sfn";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const sfnClient = new SFNClient({});
const s3Client = new S3Client({});

interface GetReportStatusArgs {
  executionArn: string;
}

interface ReportStatusResponse {
  status: string;
  reportId?: string;
  signedUrl?: string;
  s3Key?: string;
  error?: string;
}

export const handler: AppSyncResolverHandler<GetReportStatusArgs, ReportStatusResponse> = async (event) => {
  console.log("Getting report status:", JSON.stringify(event, null, 2));
  
  const { executionArn } = event.arguments;
  
  try {
    // Check Step Functions execution status
    const describeCommand = new DescribeExecutionCommand({
      executionArn
    });
    
    const executionResult = await sfnClient.send(describeCommand);
    const status = executionResult.status;
    
    console.log(`Execution status: ${status}`);
    
    if (status === "SUCCEEDED" && executionResult.output) {
      // Parse the output to get the S3 key
      const output = JSON.parse(executionResult.output);
      const s3Key = output.s3Key;
      const reportId = output.reportId;
      
      if (s3Key) {
        // Generate a new pre-signed URL
        const bucketName = process.env.USER_FILES_BUCKET_NAME;
        
        const getObjectCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: s3Key
        });
        
        const signedUrl = await getSignedUrl(s3Client, getObjectCommand, {
          expiresIn: 3600 // 1 hour
        });
        
        return {
          status: "COMPLETED",
          reportId,
          signedUrl,
          s3Key
        };
      }
    } else if (status === "FAILED") {
      return {
        status: "FAILED",
        error: "Report generation failed. Please try again."
      };
    } else if (status === "RUNNING") {
      return {
        status: "IN_PROGRESS"
      };
    }
    
    return {
      status: status || "UNKNOWN"
    };
    
  } catch (error) {
    console.error("Error checking report status:", error);
    return {
      status: "ERROR",
      error: "Unable to check report status"
    };
  }
};