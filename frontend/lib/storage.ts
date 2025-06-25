import { uploadData, downloadData, remove, list, getUrl } from 'aws-amplify/storage';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface StorageFile {
  key: string;
  size?: number;
  lastModified?: Date;
  eTag?: string;
}

// Upload a file to S3
export async function uploadFile(
  key: string,
  file: File | Blob,
  options?: {
    contentType?: string;
    metadata?: Record<string, string>;
    onProgress?: (progress: UploadProgress) => void;
  }
) {
  try {
    const result = await uploadData({
      key,
      data: file,
      options: {
        contentType: options?.contentType || file.type,
        metadata: options?.metadata,
        onProgress: options?.onProgress
          ? ({ transferredBytes, totalBytes }) => {
              if (totalBytes) {
                options.onProgress({
                  loaded: transferredBytes,
                  total: totalBytes,
                  percentage: Math.round((transferredBytes / totalBytes) * 100),
                });
              }
            }
          : undefined,
      },
    }).result;

    return result;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// Download a file from S3
export async function downloadFile(
  key: string,
  options?: {
    onProgress?: (progress: UploadProgress) => void;
  }
) {
  try {
    const result = await downloadData({
      key,
      options: {
        onProgress: options?.onProgress
          ? ({ transferredBytes, totalBytes }) => {
              if (totalBytes) {
                options.onProgress({
                  loaded: transferredBytes,
                  total: totalBytes,
                  percentage: Math.round((transferredBytes / totalBytes) * 100),
                });
              }
            }
          : undefined,
      },
    }).result;

    return result;
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

// Get a pre-signed URL for a file
export async function getFileUrl(
  key: string,
  options?: {
    expiresIn?: number; // seconds
    download?: boolean;
  }
) {
  try {
    const urlResult = await getUrl({
      key,
      options: {
        expiresIn: options?.expiresIn || 3600, // 1 hour default
        useAccelerateEndpoint: false,
      },
    });

    return urlResult.url;
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw error;
  }
}

// Delete a file from S3
export async function deleteFile(key: string) {
  try {
    await remove({ key });
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

// List files in S3
export async function listFiles(
  options?: {
    prefix?: string;
    pageSize?: number;
    nextToken?: string;
  }
): Promise<{
  files: StorageFile[];
  nextToken?: string;
}> {
  try {
    const result = await list({
      prefix: options?.prefix,
      options: {
        pageSize: options?.pageSize || 100,
        nextToken: options?.nextToken,
      },
    });

    const files: StorageFile[] = result.items.map((item) => ({
      key: item.key,
      size: item.size,
      lastModified: item.lastModified,
      eTag: item.eTag,
    }));

    return {
      files,
      nextToken: result.nextToken,
    };
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

// Helper function to generate a unique file key
export function generateFileKey(
  userId: string,
  fileName: string,
  folder?: string
): string {
  const timestamp = Date.now();
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  if (folder) {
    return `users/${userId}/${folder}/${timestamp}-${cleanFileName}`;
  }
  
  return `users/${userId}/${timestamp}-${cleanFileName}`;
}

// Helper function to get file extension
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

// Helper function to validate file type
export function isValidFileType(
  fileName: string,
  allowedTypes: string[]
): boolean {
  const extension = getFileExtension(fileName);
  return allowedTypes.includes(extension);
}

// Helper function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}