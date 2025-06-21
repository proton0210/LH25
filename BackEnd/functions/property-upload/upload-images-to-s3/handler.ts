import { S3Client, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ulid } from 'ulid';

const s3Client = new S3Client({});
const USER_FILES_BUCKET = process.env.USER_FILES_BUCKET_NAME!;

interface UploadImagesEvent {
  propertyData: {
    images: string[]; // Array of S3 keys from temporary uploads
    userId?: string;
    cognitoUserId?: string;
    [key: string]: any;
  };
}

interface UploadImagesResult {
  success: boolean;
  propertyId: string;
  uploadedImages: string[];
  error?: string;
  propertyData?: any;
}

export const handler = async (
  event: UploadImagesEvent
): Promise<UploadImagesResult> => {
  console.log('Upload images event:', JSON.stringify(event, null, 2));

  try {
    const { propertyData } = event;
    const { images, userId, cognitoUserId } = propertyData;

    if (!images || images.length === 0) {
      throw new Error('No images provided for upload');
    }

    // Generate property ID
    const propertyId = ulid();
    
    // Determine user identifier
    const userIdentifier = userId || cognitoUserId || 'anonymous';
    
    // Create destination folder path
    const listingFolder = `users/${userIdentifier}/listings/${propertyId}`;
    
    console.log(`Moving ${images.length} images to ${listingFolder}`);

    const uploadedImages: string[] = [];

    // Move each image from temp location to permanent location
    for (let i = 0; i < images.length; i++) {
      const tempKey = images[i];
      const fileExtension = tempKey.split('.').pop() || 'jpg';
      const newKey = `${listingFolder}/image-${i + 1}.${fileExtension}`;

      try {
        // Copy object to new location
        await s3Client.send(new CopyObjectCommand({
          Bucket: USER_FILES_BUCKET,
          CopySource: `${USER_FILES_BUCKET}/${tempKey}`,
          Key: newKey,
          MetadataDirective: 'COPY',
          TaggingDirective: 'COPY'
        }));

        // Delete the temporary file
        await s3Client.send(new DeleteObjectCommand({
          Bucket: USER_FILES_BUCKET,
          Key: tempKey
        }));

        uploadedImages.push(newKey);
        console.log(`Successfully moved image ${i + 1}: ${tempKey} -> ${newKey}`);
      } catch (error) {
        console.error(`Failed to move image ${tempKey}:`, error);
        // Continue with other images even if one fails
      }
    }

    if (uploadedImages.length === 0) {
      throw new Error('Failed to upload any images');
    }

    console.log(`Successfully uploaded ${uploadedImages.length} images for property ${propertyId}`);

    // Return updated property data with new image locations
    return {
      success: true,
      propertyId,
      uploadedImages,
      propertyData: {
        ...propertyData,
        id: propertyId,
        images: uploadedImages
      }
    };

  } catch (error) {
    console.error('Error uploading images:', error);
    return {
      success: false,
      propertyId: '',
      uploadedImages: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};