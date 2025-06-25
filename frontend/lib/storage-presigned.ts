import { api } from './api/graphql-client';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Upload a file to S3 using presigned URL
export async function uploadFileWithPresignedUrl(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  try {
    // Get presigned URL from backend
    const { uploadUrl, fileKey } = await api.getUploadUrl(file.name, file.type);

    // Upload file directly to S3
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(fileKey);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  } catch (error) {
    console.error('Error uploading file with presigned URL:', error);
    throw error;
  }
}

// Batch upload multiple files with progress tracking
export async function uploadMultipleFiles(
  files: File[],
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<string[]> {
  const uploadPromises = files.map((file, index) => 
    uploadFileWithPresignedUrl(file, (progress) => {
      if (onProgress) {
        onProgress(index, progress);
      }
    })
  );

  return Promise.all(uploadPromises);
}

// Helper function to validate image files
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload JPG, PNG, or WEBP images.' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File too large. Maximum size is 10MB.' };
  }

  return { valid: true };
}

// Helper function to compress image if needed
export async function compressImage(file: File, maxWidth: number = 1920): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        }, file.type, 0.9);
      };
    };
  });
}