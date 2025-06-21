import { AppSyncResolverHandler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.USER_FILES_BUCKET_NAME!;
const UPLOAD_EXPIRY_SECONDS = 300; // 5 minutes

interface GetUploadUrlArgs {
  fileName: string;
  contentType: string;
}

interface UploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
}

export const handler: AppSyncResolverHandler<GetUploadUrlArgs, UploadUrlResponse> = async (event) => {
  console.log('GetUploadUrl event:', JSON.stringify(event, null, 2));

  const { fileName, contentType } = event.arguments;

  // Validate inputs
  if (!fileName || !contentType) {
    throw new Error('fileName and contentType are required');
  }

  // Validate content type (only allow images)
  const allowedContentTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];

  if (!allowedContentTypes.includes(contentType)) {
    throw new Error(`Invalid content type. Allowed types: ${allowedContentTypes.join(', ')}`);
  }

  // Generate a unique file key for temporary storage
  const fileExtension = fileName.split('.').pop() || 'jpg';
  const uniqueId = randomUUID();
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const fileKey = `temp-uploads/${timestamp}/${uniqueId}.${fileExtension}`;

  try {
    // Create the PutObject command
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
      // Add metadata
      Metadata: {
        originalFileName: fileName,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Generate pre-signed URL
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: UPLOAD_EXPIRY_SECONDS,
    });

    return {
      uploadUrl,
      fileKey,
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    throw new Error('Failed to generate upload URL');
  }
};