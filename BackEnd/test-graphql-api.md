# Testing the Real Estate GraphQL API

## Overview
This API allows public users to submit property listings with images, while authenticated users can manage their own properties and admins can approve/reject submissions.

## Authentication
- **Public endpoints**: `getUploadUrl`, `createProperty`, `getProperty`, `listProperties`
- **Authenticated endpoints**: `listMyProperties`, `updateProperty`, `deleteProperty`
- **Admin-only endpoints**: `approveProperty`, `rejectProperty`

## Testing Workflow

### 1. Get Pre-signed URLs for Image Upload
```graphql
mutation GetUploadUrl {
  getUploadUrl(
    fileName: "house-front.jpg"
    contentType: "image/jpeg"
  ) {
    uploadUrl
    fileKey
  }
}
```

### 2. Upload Images Directly to S3
Use the returned `uploadUrl` to upload images directly:
```bash
curl -X PUT \
  -H "Content-Type: image/jpeg" \
  -T ./house-front.jpg \
  "PRESIGNED_URL_HERE"
```

### 3. Submit Property (Public)
```graphql
mutation CreateProperty {
  createProperty(input: {
    title: "Beautiful 4BR Family Home"
    description: "Spacious family home with modern amenities"
    price: 450000
    address: "123 Main Street"
    city: "Seattle"
    state: "WA"
    zipCode: "98101"
    bedrooms: 4
    bathrooms: 2.5
    squareFeet: 2500
    propertyType: SINGLE_FAMILY
    listingType: FOR_SALE
    images: ["property-images/2024-01-17/uuid-123.jpg"]
    contactName: "John Doe"
    contactEmail: "john@example.com"
    contactPhone: "555-123-4567"
    amenities: ["Garage", "Garden", "Pool"]
    yearBuilt: 2015
    lotSize: 0.25
    parkingSpaces: 2
  }) {
    id
    title
    status
    submittedAt
  }
}
```

### 4. List Properties (Public)
```graphql
query ListProperties {
  listProperties(
    filter: {
      city: "Seattle"
      minPrice: 300000
      maxPrice: 600000
      propertyType: SINGLE_FAMILY
    }
    limit: 10
  ) {
    items {
      id
      title
      price
      city
      bedrooms
      bathrooms
      images
    }
    nextToken
  }
}
```

### 5. Get Property Details (Public)
```graphql
query GetProperty {
  getProperty(id: "PROPERTY_ID_HERE") {
    id
    title
    description
    price
    address
    city
    state
    zipCode
    bedrooms
    bathrooms
    squareFeet
    propertyType
    listingType
    images
    contactName
    contactEmail
    contactPhone
    amenities
    yearBuilt
    status
    submittedAt
  }
}
```

### 6. Authenticated User Operations

#### List My Properties
```graphql
query ListMyProperties {
  listMyProperties(limit: 20) {
    items {
      id
      title
      price
      status
      submittedAt
      updatedAt
    }
    nextToken
  }
}
```

#### Update Property
```graphql
mutation UpdateProperty {
  updateProperty(input: {
    id: "PROPERTY_ID_HERE"
    price: 475000
    description: "Updated description with new features"
  }) {
    id
    price
    description
    updatedAt
  }
}
```

#### Delete Property
```graphql
mutation DeleteProperty {
  deleteProperty(id: "PROPERTY_ID_HERE") {
    id
    title
  }
}
```

### 7. Admin Operations

#### Approve Property
```graphql
mutation ApproveProperty {
  approveProperty(id: "PROPERTY_ID_HERE") {
    id
    status
    updatedAt
  }
}
```

#### Reject Property
```graphql
mutation RejectProperty {
  rejectProperty(
    id: "PROPERTY_ID_HERE"
    reason: "Images are not clear, please resubmit with better quality photos"
  ) {
    id
    status
    updatedAt
  }
}
```

## API Headers

### For Public Access (API Key)
```json
{
  "x-api-key": "YOUR_API_KEY_HERE"
}
```

### For Authenticated Access (Cognito)
```json
{
  "Authorization": "Bearer YOUR_ID_TOKEN_HERE"
}
```

## Error Handling
The API will return appropriate error messages for:
- Invalid input data
- Unauthorized access attempts
- Missing required fields
- Invalid content types for images
- Property not found scenarios

## Rate Limiting
Consider implementing rate limiting for public endpoints to prevent abuse.

## Image Upload Best Practices
1. Validate file size on client (recommend < 5MB per image)
2. Compress images before upload
3. Support multiple image formats: JPEG, PNG, WebP
4. Generate thumbnails after upload (can be added as a Lambda trigger)