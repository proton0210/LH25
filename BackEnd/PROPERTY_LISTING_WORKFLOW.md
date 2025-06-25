# Property Listing Workflow

## Overview

The property listing workflow is a sophisticated, event-driven system that processes property submissions through multiple stages using AWS serverless services. The workflow ensures data validation, image processing, persistence, and admin review with proper notifications at each stage.

## Workflow Architecture

```
User → GraphQL API → SQS Queue → Lambda Consumer → Step Functions → DynamoDB
                                                            ↓
                                                    Admin Review
                                                            ↓
                                                    EventBridge → Email Notification
```

## Detailed Workflow Steps

### 1. Property Submission (GraphQL Mutation)

**Endpoint**: `createProperty` mutation  
**Handler**: `/functions/appsync-resolvers/create-property.ts`

**Process**:
1. User submits property details through GraphQL API
2. Basic validation of required fields
3. System generates unique property ID (ULID)
4. Identifies user (authenticated) or marks as anonymous
5. Creates message payload with all property data
6. Sends message to SQS queue
7. Returns immediate success response to user

**Response**:
```json
{
  "propertyId": "01HJKA3N5X6Q9R2S4T5V7W8Y9Z",
  "message": "Property upload request received. You will receive an email notification once your listing is processed.",
  "queueMessageId": "msg-123-456"
}
```

### 2. Queue Processing

**Queue**: `lh-property-upload-queue`
- Visibility timeout: 180 seconds (3 minutes)
- Dead letter queue: After 3 failed attempts
- Batch size: 5 messages
- Max batching window: 20 seconds

**Consumer Lambda**: `/functions/queue-consumers/property-upload-consumer/handler.ts`
- Polls queue for new messages
- Extracts property data from message
- Starts Step Functions execution
- Execution name: `property-upload-{propertyId}-{timestamp}`

### 3. Step Functions Workflow

**State Machine**: `property-upload-workflow`  
**Timeout**: 5 minutes

#### Step 3.1: Validate Property Data
**Lambda**: `/functions/property-upload/validate-property-data/handler.ts`

**Validations**:
- ✓ All required fields present
- ✓ Valid email format
- ✓ Valid phone format
- ✓ Price > 0
- ✓ Bedrooms/bathrooms ≥ 0
- ✓ Square feet > 0
- ✓ At least one image provided
- ✓ Valid property type (SINGLE_FAMILY, CONDO, etc.)
- ✓ Valid listing type (FOR_SALE, FOR_RENT, etc.)
- ✓ Year built between 1800 and next year
- ✓ Valid US zip code format

**Failure**: Stops workflow with validation errors

#### Step 3.2: Upload Images to S3
**Lambda**: `/functions/property-upload/upload-images-to-s3/handler.ts`

**Process**:
1. **For external URLs**:
   - Downloads images from external sources
   - Validates image format
   - Saves to S3 bucket

2. **For uploaded files**:
   - Moves from temp location to permanent storage
   - Path: `{userId}/listings/{propertyId}/`
   - Renames: `image-1.jpg`, `image-2.jpg`, etc.

3. **Cleanup**:
   - Deletes temporary files
   - Records metadata

**Failure**: Continues if at least one image succeeds

#### Step 3.3: Save to DynamoDB
**Lambda**: `/functions/property-upload/save-property-to-dynamodb/handler.ts`

**Data Structure**:
```typescript
{
  pk: "PROPERTY",
  sk: "PROPERTY#{propertyId}",
  id: propertyId,
  status: "PENDING_REVIEW",
  submittedAt: timestamp,
  updatedAt: timestamp,
  // ... all property fields
  
  // GSI attributes for querying
  gsi1pk: "STATUS#PENDING_REVIEW",
  gsi1sk: timestamp,
  gsi2pk: "STATE#{state}",
  gsi2sk: "CITY#{city}",
  gsi3pk: "TYPE#{propertyType}",
  gsi3sk: timestamp,
  gsi4pk: "LISTING#{listingType}",
  gsi4sk: timestamp,
  gsi5pk: "USER#{userId}", // if authenticated
  gsi5sk: timestamp
}
```

**Failure**: Fails workflow with save error

#### Step 3.4: Send Notification
**Lambda**: `/functions/property-upload/send-pending-approval-notification/handler.ts`

**Email Content**:
- Property summary
- Property ID for tracking
- Expected review time (1-2 business days)
- Professional HTML template

**Recipients**:
- Authenticated users: Profile email
- Anonymous: Contact email from submission

**Failure**: Logs error but doesn't fail workflow

### 4. Admin Review Process

Properties remain in `PENDING_REVIEW` status until admin action.

#### 4.1 Approval Flow

**Mutation**: `approveProperty(id: ID!)`  
**Handler**: `/functions/appsync-resolvers/approve-property.ts`

**Process**:
1. Verify admin permissions
2. Update property status to `ACTIVE`
3. Set approval metadata:
   - `approvedBy`: Admin user ID
   - `approvedAt`: Timestamp
4. Update all GSI indexes
5. Publish to EventBridge:
   ```json
   {
     "source": "lh.admin",
     "detailType": "Property Approved",
     "detail": { propertyId, approvedBy, ... }
   }
   ```

**Event Handler**: `/functions/event-handlers/property-approved-handler.ts`
- Queries user details from DynamoDB
- Sends approval email with:
  - Congratulations message
  - Property details
  - Link to view listing

#### 4.2 Rejection Flow

**Mutation**: `rejectProperty(id: ID!, reason: String!)`  
**Handler**: `/functions/appsync-resolvers/reject-property.ts`

**Process**:
1. Verify admin permissions
2. Update property status to `REJECTED`
3. Store rejection reason
4. Publish rejection event
5. Send rejection email with reason

### 5. Property Status Lifecycle

```
PENDING_REVIEW ──┬──→ ACTIVE (Approved)
                 ├──→ REJECTED (With reason)
                 └──→ INACTIVE (Manual deactivation)
```

### 6. Query Capabilities

#### Public Queries (Authenticated Users)
- **listProperties**: All active properties with filters
- **getProperty**: Single property by ID
- **listMyProperties**: User's own properties (all statuses)

#### Admin Queries
- **listPendingProperties**: Properties awaiting review

#### Filters Available
- City/State
- Price range (min/max)
- Bedrooms (minimum)
- Bathrooms (minimum)
- Property type
- Listing type
- Status (admin only)

### 7. Error Handling

#### Step Functions Error States
- **ValidationFailed**: Invalid property data
- **UploadFailed**: All image uploads failed
- **SaveFailed**: Database save error

#### Queue Error Handling
- **Retry**: 3 attempts with exponential backoff
- **DLQ**: Failed messages after max retries
- **Alarms**: Triggered on DLQ messages

#### Monitoring & Alarms
- Queue depth > 100 messages
- Message age > 5-10 minutes
- Any DLQ messages
- Lambda error rates > 5 errors in 2 periods
- CloudWatch dashboard for metrics

### 8. Security & Permissions

#### Authentication
- All mutations require Cognito authentication
- Admin group required for approval/rejection
- Users can only modify their own properties

#### Data Privacy
- User emails from secure profile (not form input)
- Anonymous submissions tracked separately
- Signed URLs for image access (time-limited)

### 9. Performance Characteristics

- **Response Time**: Immediate (async processing)
- **Processing Time**: ~30-60 seconds per property
- **Concurrent Processing**: Up to 5 properties
- **Image Processing**: Parallel downloads
- **Query Performance**: Optimized with 5 GSIs
- **Scalability**: Auto-scales with demand

## Summary

The property listing workflow provides:
- ✅ Reliable async processing
- ✅ Comprehensive validation
- ✅ Secure image handling
- ✅ Admin review workflow
- ✅ Automated notifications
- ✅ Error resilience
- ✅ Performance optimization
- ✅ Complete audit trail

This architecture ensures that every property submission is processed reliably, validated thoroughly, and reviewed appropriately before becoming visible to users.