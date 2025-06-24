import { SQSHandler, SQSEvent } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import axios from 'axios';
import sharp from 'sharp';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

interface ImageProcessingMessage {
  propertyId: string;
  userId: string;
  images: {
    url: string;
    caption?: string;
    order?: number;
  }[];
  tempFolder: string;
  finalFolder: string;
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log('Processing image messages:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const message: ImageProcessingMessage = JSON.parse(record.body);
      console.log(`Processing images for property: ${message.propertyId}`);

      // Update property status to processing images
      await updatePropertyStatus(message.propertyId, message.userId, 'PROCESSING_IMAGES');

      const processedImages = [];

      // Process each image
      for (let i = 0; i < message.images.length; i++) {
        const image = message.images[i];
        const imageKey = await processImage(image, message, i);
        processedImages.push({
          url: `https://${process.env.USER_FILES_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${imageKey}`,
          caption: image.caption,
          order: image.order || i,
        });
      }

      // Move images from temp to final location
      await moveImagesToFinalLocation(message);

      // Update property with processed image URLs
      await updatePropertyImages(message.propertyId, message.userId, processedImages);

      console.log(`Successfully processed images for property: ${message.propertyId}`);
    } catch (error) {
      console.error('Error processing message:', error);
      throw error; // Let SQS handle retry
    }
  }
};

async function processImage(
  image: { url: string; caption?: string; order?: number },
  message: ImageProcessingMessage,
  index: number
): Promise<string> {
  try {
    // Download image from URL
    const response = await axios.get(image.url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: 50 * 1024 * 1024, // 50MB max
    });

    const imageBuffer = Buffer.from(response.data);

    // Process image with sharp (resize, optimize)
    const processedBuffer = await sharp(imageBuffer)
      .resize(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    // Generate thumbnail
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(400, 300, {
        fit: 'cover',
      })
      .jpeg({ quality: 70 })
      .toBuffer();

    // Save processed image to S3
    const timestamp = Date.now();
    const imageKey = `${message.tempFolder}/image_${index}_${timestamp}.jpg`;
    const thumbnailKey = `${message.tempFolder}/thumb_${index}_${timestamp}.jpg`;

    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.USER_FILES_BUCKET_NAME!,
      Key: imageKey,
      Body: processedBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        propertyId: message.propertyId,
        caption: image.caption || '',
        order: String(image.order || index),
      },
    }));

    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.USER_FILES_BUCKET_NAME!,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        propertyId: message.propertyId,
        caption: image.caption || '',
        order: String(image.order || index),
        isThumbnail: 'true',
      },
    }));

    return imageKey;
  } catch (error) {
    console.error(`Failed to process image: ${image.url}`, error);
    throw error;
  }
}

async function moveImagesToFinalLocation(message: ImageProcessingMessage): Promise<void> {
  // In production, implement logic to copy images from temp to final folder
  // and delete the temp folder
  console.log(`Moving images from ${message.tempFolder} to ${message.finalFolder}`);
}

async function updatePropertyStatus(
  propertyId: string,
  userId: string,
  status: string
): Promise<void> {
  const command = new UpdateItemCommand({
    TableName: process.env.PROPERTIES_TABLE_NAME!,
    Key: {
      pk: { S: `PROPERTY#${propertyId}` },
      sk: { S: `METADATA` },
    },
    UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'imageProcessingStatus',
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: {
      ':status': { S: status },
      ':updatedAt': { S: new Date().toISOString() },
    },
  });

  await dynamoClient.send(command);
}

async function updatePropertyImages(
  propertyId: string,
  userId: string,
  images: any[]
): Promise<void> {
  const command = new UpdateItemCommand({
    TableName: process.env.PROPERTIES_TABLE_NAME!,
    Key: {
      pk: { S: `PROPERTY#${propertyId}` },
      sk: { S: `METADATA` },
    },
    UpdateExpression: 'SET #images = :images, #imageProcessingStatus = :status, #updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#images': 'processedImages',
      '#imageProcessingStatus': 'imageProcessingStatus',
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: {
      ':images': { S: JSON.stringify(images) },
      ':status': { S: 'COMPLETED' },
      ':updatedAt': { S: new Date().toISOString() },
    },
  });

  await dynamoClient.send(command);
}