# Property Upload Guide

This guide explains how to use the property upload functionality that supports both external image URLs and direct file uploads.

## Overview

The property upload system supports two types of images:
1. **External URLs** (e.g., from Unsplash, property listing sites)
2. **Direct file uploads** from user's device

## Step-by-Step Process

### 1. Get Pre-signed URLs for File Uploads

For each image file the user wants to upload:

```graphql
mutation GetUploadUrl {
  getUploadUrl(
    fileName: "kitchen.jpg"
    contentType: "image/jpeg"
  ) {
    uploadUrl
    fileKey
  }
}
```

Response:
```json
{
  "data": {
    "getUploadUrl": {
      "uploadUrl": "https://lh-user-files-xxx.s3.amazonaws.com/temp-uploads/2025-06-21/abc123.jpg?...",
      "fileKey": "temp-uploads/2025-06-21/abc123.jpg"
    }
  }
}
```

### 2. Upload Files to S3

Use the pre-signed URL to upload the file directly to S3:

```javascript
const uploadFile = async (file, uploadUrl) => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to upload file');
  }
};
```

### 3. Create Property with Mixed Image Types

Submit the property with both S3 keys (from uploads) and external URLs:

```graphql
mutation CreateProperty {
  createProperty(input: {
    title: "Luxury Downtown Apartment"
    description: "Beautiful 2BR apartment with city views"
    price: 850000
    address: "123 Main St"
    city: "Boston"
    state: "MA"
    zipCode: "02108"
    bedrooms: 2
    bathrooms: 2
    squareFeet: 1200
    propertyType: CONDO
    listingType: FOR_SALE
    images: [
      "temp-uploads/2025-06-21/abc123.jpg",  # Uploaded file
      "temp-uploads/2025-06-21/def456.jpg",  # Uploaded file
      "https://images.unsplash.com/photo-xxx", # External URL
      "https://example.com/property-image.jpg" # External URL
    ]
    contactName: "John Doe"
    contactEmail: "john@example.com"
    contactPhone: "(555) 123-4567"
    amenities: ["Gym", "Pool", "Parking"]
    yearBuilt: 2020
  }) {
    executionArn
    startDate
    message
  }
}
```

Response:
```json
{
  "data": {
    "createProperty": {
      "executionArn": "arn:aws:states:us-east-1:xxx:execution:property-upload-workflow:xxx",
      "startDate": "2025-06-21T10:30:00.000Z",
      "message": "Property upload workflow started successfully. You will receive an email notification once your listing is processed."
    }
  }
}
```

## How the System Processes Images

1. **External URLs** (http:// or https://):
   - Downloaded from the source URL
   - Saved to S3 in `users/{userId}/listings/{propertyId}/`
   - Original URL stored as metadata
   - S3 key saved in the database

2. **Uploaded Files** (S3 keys):
   - Moved from `temp-uploads/` to `users/{userId}/listings/{propertyId}/`
   - Original temp files are deleted after successful move
   - Permanent storage in user's dedicated folder

**Benefits of downloading external URLs:**
- All images are stored in your S3 bucket
- No dependency on external sources
- Consistent performance and availability
- Full control over image assets
- Protection against external URLs becoming unavailable

## Complete Frontend Example

```javascript
// Frontend implementation example
const createPropertyListing = async (propertyData, imageFiles, imageUrls) => {
  try {
    // Step 1: Upload image files
    const uploadedImages = [];
    
    for (const file of imageFiles) {
      // Get upload URL
      const { data } = await graphqlClient.mutate({
        mutation: GET_UPLOAD_URL,
        variables: {
          fileName: file.name,
          contentType: file.type
        }
      });
      
      const { uploadUrl, fileKey } = data.getUploadUrl;
      
      // Upload file to S3
      await uploadFile(file, uploadUrl);
      
      // Store the S3 key
      uploadedImages.push(fileKey);
    }
    
    // Step 2: Combine uploaded images with external URLs
    const allImages = [...uploadedImages, ...imageUrls];
    
    // Step 3: Create property
    const { data } = await graphqlClient.mutate({
      mutation: CREATE_PROPERTY,
      variables: {
        input: {
          ...propertyData,
          images: allImages
        }
      }
    });
    
    console.log('Property created:', data.createProperty);
    return data.createProperty;
    
  } catch (error) {
    console.error('Error creating property:', error);
    throw error;
  }
};

// Usage
const propertyData = {
  title: "Modern Condo",
  description: "Stunning views",
  price: 750000,
  // ... other fields
};

const imageFiles = [file1, file2]; // File objects from input
const imageUrls = [
  "https://images.unsplash.com/photo-xxx",
  "https://example.com/image.jpg"
];

await createPropertyListing(propertyData, imageFiles, imageUrls);
```

## Property Status Flow

1. **Upload Initiated** → Step Functions workflow starts
2. **Validation** → All property data is validated
3. **Image Processing** → Images are moved/stored appropriately
4. **Database Save** → Property saved with `PENDING_REVIEW` status
5. **Notification** → Email sent to property owner
6. **Admin Review** → Admin approves/rejects the listing
7. **Active** → Property becomes visible on the website

## Error Handling

The Step Functions workflow includes error handling at each step:
- Validation errors → Workflow fails with validation error details
- Image upload failures → Workflow continues if at least one image succeeds
- Database save failures → Workflow fails with save error
- Notification failures → Workflow retries but doesn't fail the entire process

## Best Practices

1. **Image Guidelines**:
   - Supported formats: JPEG, PNG, GIF, WebP, SVG
   - Recommended size: Under 5MB per image
   - Minimum images: At least 1 image required

2. **URL Images**:
   - Ensure URLs are publicly accessible
   - Use HTTPS URLs when possible
   - Consider image licensing/permissions

3. **File Uploads**:
   - Validate file types before uploading
   - Show upload progress to users
   - Handle upload failures gracefully

4. **Mixed Sources**:
   - Order images appropriately (hero image first)
   - Limit total number of images (e.g., max 20)
   - Provide image captions/descriptions when possible