import { AppSyncResolverEvent } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.BUCKET_NAME!;
const UPLOAD_EXPIRY_SECONDS = 300; // 5 minutes

interface GetUploadUrlArgs {
  fileName: string;
  contentType: string;
}

interface UploadUrlResponse {
  uploadUrl: string;
  fileUrl: string;
}

export const handler = async (
  event: AppSyncResolverEvent<GetUploadUrlArgs>
): Promise<UploadUrlResponse> => {
  console.log('GetUploadUrl event:', JSON.stringify(event, null, 2));

  const { fileName, contentType } = event.arguments;
  
  // Validate content type (only allow images)
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(contentType)) {
    throw new Error(`Invalid content type. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Generate unique key for the file
  const fileExtension = fileName.split('.').pop();
  const uniqueId = randomUUID();
  const timestamp = Date.now();
  const key = `property-images/${timestamp}-${uniqueId}.${fileExtension}`;

  try {
    // Create the command for put object
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    // Generate pre-signed URL
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: UPLOAD_EXPIRY_SECONDS,
    });

    // The URL where the file will be accessible after upload
    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    console.log('Generated upload URL for key:', key);

    return {
      uploadUrl,
      fileUrl,
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    throw new Error('Failed to generate upload URL');
  }
};