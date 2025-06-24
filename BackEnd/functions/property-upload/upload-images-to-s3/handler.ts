import { S3Client, CopyObjectCommand, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { ulid } from 'ulid';

const s3Client = new S3Client({});
const USER_FILES_BUCKET = process.env.USER_FILES_BUCKET_NAME!;

interface UploadImagesEvent {
  propertyData: {
    images: string[]; // Array of S3 keys from temporary uploads
    userId?: string;
    cognitoUserId?: string;
    propertyId?: string; // Property ID from the queue message
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
    const { images, userId, cognitoUserId, propertyId: existingPropertyId } = propertyData;

    if (!images || images.length === 0) {
      throw new Error('No images provided for upload');
    }

    // Use existing property ID or generate new one
    const propertyId = existingPropertyId || ulid();
    
    // Determine user identifier - userId is the actual folder name created during signup
    const userFolder = userId || 'anonymous';
    
    // Create destination folder path within the existing user folder
    const listingFolder = `${userFolder}/listings/${propertyId}`;
    
    console.log(`Processing ${images.length} images for ${listingFolder}`);

    // Always process images synchronously within Step Functions

    const uploadedImages: string[] = [];

    // Process each image
    for (let i = 0; i < images.length; i++) {
      const imageSource = images[i];
      
      // Check if it's a URL or S3 key
      if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
        // Download the image from URL and upload to S3
        try {
          console.log(`Downloading image from URL: ${imageSource}`);
          
          // Fetch the image
          const response = await fetch(imageSource);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          
          // Get the image data as a buffer
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Determine content type and extension
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          let fileExtension = 'jpg';
          
          if (contentType.includes('png')) fileExtension = 'png';
          else if (contentType.includes('gif')) fileExtension = 'gif';
          else if (contentType.includes('webp')) fileExtension = 'webp';
          else if (contentType.includes('svg')) fileExtension = 'svg';
          
          // Create S3 key for the downloaded image
          const newKey = `${listingFolder}/image-${i + 1}.${fileExtension}`;
          
          // Upload to S3
          await s3Client.send(new PutObjectCommand({
            Bucket: USER_FILES_BUCKET,
            Key: newKey,
            Body: buffer,
            ContentType: contentType,
            Metadata: {
              originalUrl: imageSource,
              downloadedAt: new Date().toISOString()
            }
          }));
          
          uploadedImages.push(newKey);
          console.log(`Successfully downloaded and saved image ${i + 1}: ${imageSource} -> ${newKey}`);
        } catch (error) {
          console.error(`Failed to download image from URL ${imageSource}:`, error);
          // Continue with other images even if one fails
        }
      } else {
        // It's an S3 key, move it from temp to permanent location
        const fileExtension = imageSource.split('.').pop() || 'jpg';
        const newKey = `${listingFolder}/image-${i + 1}.${fileExtension}`;

        try {
          // Copy object to new location
          await s3Client.send(new CopyObjectCommand({
            Bucket: USER_FILES_BUCKET,
            CopySource: `${USER_FILES_BUCKET}/${imageSource}`,
            Key: newKey,
            MetadataDirective: 'COPY',
            TaggingDirective: 'COPY'
          }));

          // Delete the temporary file
          await s3Client.send(new DeleteObjectCommand({
            Bucket: USER_FILES_BUCKET,
            Key: imageSource
          }));

          uploadedImages.push(newKey);
          console.log(`Successfully moved image ${i + 1}: ${imageSource} -> ${newKey}`);
        } catch (error) {
          console.error(`Failed to move image ${imageSource}:`, error);
          // Continue with other images even if one fails
        }
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