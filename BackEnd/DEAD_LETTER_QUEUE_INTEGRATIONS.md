# Dead Letter Queue (DLQ) Integrations

## Overview

Dead Letter Queues (DLQs) are integrated in your serverless application to handle failed message processing and ensure system reliability. They act as a safety net for messages that cannot be processed successfully after multiple attempts.

**Current DLQ Implementations**:
- AI Processing Queue → AI Processing DLQ
- Property Upload Queue → Property Upload DLQ
- EventBridge Rules → No DLQ (removed for simplicity)

## DLQ Implementations

### 1. AI Processing Dead Letter Queue

**Queue Name**: `lh-ai-processing-dlq`  
**Retention Period**: 14 days  
**Associated With**: AI Processing Queue

**Configuration**:
```typescript
const aiProcessingDLQ = new sqs.Queue(this, "AIProcessingDLQ", {
  queueName: "lh-ai-processing-dlq",
  retentionPeriod: cdk.Duration.days(14),
});
```

**Main Queue Configuration**:
```typescript
const aiProcessingQueue = new sqs.Queue(this, "AIProcessingQueue", {
  queueName: "lh-ai-processing-queue",
  visibilityTimeout: cdk.Duration.seconds(300), // 5 minutes
  retentionPeriod: cdk.Duration.days(4),
  deadLetterQueue: {
    queue: aiProcessingDLQ,
    maxReceiveCount: 3,  // Messages moved to DLQ after 3 failed attempts
  },
});
```

**Purpose**: Captures failed AI report generation requests
- Messages that fail after 3 processing attempts
- Includes property report generation requests that couldn't trigger Step Functions
- Preserves failed messages for 14 days for investigation

### 2. Property Upload Dead Letter Queue

**Queue Name**: `lh-property-upload-dlq`  
**Retention Period**: 14 days  
**Associated With**: Property Upload Queue

**Configuration**:
```typescript
const propertyUploadDLQ = new sqs.Queue(this, "PropertyUploadDLQ", {
  queueName: "lh-property-upload-dlq",
  retentionPeriod: cdk.Duration.days(14),
});
```

**Main Queue Configuration**:
```typescript
const propertyUploadQueue = new sqs.Queue(this, "PropertyUploadQueue", {
  queueName: "lh-property-upload-queue",
  visibilityTimeout: cdk.Duration.seconds(180), // 3 minutes
  retentionPeriod: cdk.Duration.days(4),
  deadLetterQueue: {
    queue: propertyUploadDLQ,
    maxReceiveCount: 3,  // Messages moved to DLQ after 3 failed attempts
  },
});
```

**Purpose**: Captures failed property upload requests
- Messages that fail after 3 processing attempts
- Includes property submissions that couldn't trigger Step Functions
- Preserves failed messages for 14 days for investigation

### 3. EventBridge Configuration (No DLQ)

**Associated With**: EventBridge Rules for Admin Operations

**Configuration for Property Approved Events**:
```typescript
propertyApprovedRule.addTarget(new eventsTargets.LambdaFunction(propertyApprovedHandlerLambda, {
  maxEventAge: cdk.Duration.hours(2),
  retryAttempts: 2,
}));
```

**Configuration for Property Rejected Events**:
```typescript
propertyRejectedRule.addTarget(new eventsTargets.LambdaFunction(propertyRejectedHandlerLambda, {
  maxEventAge: cdk.Duration.hours(2),
  retryAttempts: 2,
}));
```

**Retry Policy**: 
- Events are retried up to 2 times
- Events older than 2 hours are discarded
- No DLQ configured - failed events are not preserved

## Monitoring and Alarms

### DLQ-Specific Alarms

#### 1. AI Processing DLQ Alarm
```typescript
const aiDLQAlarm = new cloudwatch.Alarm(this, "AIDLQAlarm", {
  metric: aiProcessingDLQ.metricApproximateNumberOfMessagesVisible(),
  threshold: 1,  // Alert on ANY message in DLQ
  evaluationPeriods: 1,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  alarmDescription: "AI Processing DLQ has messages",
});
```

#### 2. Property Upload DLQ Alarm
```typescript
const propertyUploadDLQAlarm = new cloudwatch.Alarm(this, "PropertyUploadDLQAlarm", {
  metric: propertyUploadDLQ.metricApproximateNumberOfMessagesVisible(),
  threshold: 1,  // Alert on ANY message in DLQ
  evaluationPeriods: 1,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  alarmDescription: "Property Upload DLQ has messages",
});
```

### Alarm Actions
All DLQ alarms trigger SNS notifications:
```typescript
[aiDLQAlarm, propertyUploadDLQAlarm].forEach(alarm => {
  alarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));
});
```

### CloudWatch Dashboard Integration
DLQ metrics are displayed on the main dashboard:
```typescript
new cloudwatch.GraphWidget({
  title: "Queue Depths",
  left: [
    aiProcessingQueue.metricApproximateNumberOfMessagesVisible(),
    propertyUploadQueue.metricApproximateNumberOfMessagesVisible(),
  ],
  right: [
    aiProcessingDLQ.metricApproximateNumberOfMessagesVisible(),
    propertyUploadDLQ.metricApproximateNumberOfMessagesVisible(),
  ],
})
```

## Message Flow to DLQ

### SQS Queue Message Flow
```
Main Queue → Lambda Consumer (Attempt 1) → Failure
    ↓
Main Queue → Lambda Consumer (Attempt 2) → Failure
    ↓
Main Queue → Lambda Consumer (Attempt 3) → Failure
    ↓
Dead Letter Queue (Message preserved for 14 days)
```

### EventBridge Message Flow
```
EventBridge Rule → Lambda Target (Attempt 1) → Failure
    ↓
EventBridge Rule → Lambda Target (Attempt 2) → Failure
    ↓
Dead Letter Queue (if max age exceeded or retry limit reached)
```

## DLQ Message Structure

Messages in DLQ retain their original structure plus metadata:

### SQS DLQ Messages Include:
- Original message body
- Message attributes
- Approximate receive count
- First receive timestamp
- Sent timestamp

### EventBridge DLQ Messages Include:
- Original event detail
- Event source
- Detail type
- Time
- Resources
- Account/Region info

## Recovery Strategies

### Manual Reprocessing
1. Monitor DLQ alarms
2. Investigate failure reason in CloudWatch logs
3. Fix underlying issue
4. Move messages back to main queue using AWS Console or CLI

### Automated Reprocessing (Not Currently Implemented)
Could be added:
- Lambda function to periodically check DLQ
- Analyze failure patterns
- Retry messages with exponential backoff
- Move permanently failed messages to long-term storage

## Best Practices Implemented

1. **Appropriate Retention**: 14 days allows ample time for investigation
2. **Low Threshold Alarms**: Alert on ANY message in DLQ (threshold: 1)
3. **Reasonable Retry Attempts**: 3 attempts for SQS, 2 for EventBridge
4. **Visibility Timeouts**: Set appropriately for processing time
   - AI Processing: 5 minutes
   - Property Upload: 3 minutes
5. **Simplified EventBridge**: No DLQ for notifications, relies on retry policy
6. **Comprehensive Monitoring**: Dashboard widgets and alarms for visibility

## Summary

The DLQ implementation provides:
- **Reliability**: No message loss for SQS queue processing
- **Visibility**: Immediate alerts when messages fail
- **Investigation**: 14-day retention for root cause analysis
- **Recovery**: Messages can be reprocessed after fixing issues
- **Simplified Architecture**: EventBridge relies on built-in retry mechanism

**Note**: EventBridge rules for property approval/rejection notifications do not use DLQ. Failed events are retried twice with a 2-hour maximum age, after which they are discarded. This is acceptable for notification events as the property status change is already persisted in DynamoDB.