# Property API Documentation

## Authentication Requirements

**All operations in the Property API require authentication.** There is no public access to any queries or mutations.

### Authentication Flow

1. **User Registration**: Users must first register through Cognito
2. **Email Verification**: Users must verify their email address
3. **Group Assignment**: Users are automatically added to the 'user' group after registration
4. **Authentication**: Users must authenticate to receive tokens for API access

### User Groups and Permissions

- **user**: Basic users who can create, view, and manage their own properties
- **paid**: Premium users with same permissions as 'user' (for future features)
- **admin**: Can approve/reject properties and perform all operations

### API Operations

#### Queries (Require Authentication)
- `getProperty`: View a specific property
- `listProperties`: List all approved properties
- `listMyProperties`: List properties created by the authenticated user

#### Mutations (Require Authentication)
- `getUploadUrl`: Get pre-signed S3 URL for image uploads
- `createProperty`: Create a new property listing
- `updateProperty`: Update your own property
- `deleteProperty`: Delete your own property
- `approveProperty`: Approve a property (admin only)
- `rejectProperty`: Reject a property (admin only)

### Property Submission Flow

1. **Authenticate**: User logs in with Cognito credentials
2. **Get Upload URLs**: Request pre-signed URLs for each image
3. **Upload Images**: Upload images directly to S3
4. **Create Property**: Submit property data with image URLs
5. **Review Process**: Property starts in PENDING_REVIEW status
6. **Admin Approval**: Admin reviews and approves/rejects
7. **Public Listing**: Approved properties become visible

### Testing the API

Use the provided test script:
```bash
./test-property-upload.sh
```

This demonstrates the complete authenticated property upload flow.

### Security Benefits

By requiring authentication for all operations:
- No spam submissions from anonymous users
- User accountability for all submissions
- Ability to track and manage user content
- Enhanced security and data protection
- Better control over API usage and rate limiting