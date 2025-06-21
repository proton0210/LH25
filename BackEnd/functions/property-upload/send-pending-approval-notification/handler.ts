import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const USER_TABLE_NAME = process.env.USER_TABLE_NAME!;
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

interface NotificationEvent {
  property: {
    id: string;
    title: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    price: number;
    contactEmail: string;
    contactName: string;
    submittedBy?: string;
    [key: string]: any;
  };
}

interface NotificationResult {
  success: boolean;
  message: string;
  error?: string;
}

export const handler = async (
  event: NotificationEvent
): Promise<NotificationResult> => {
  console.log('Send notification event:', JSON.stringify(event, null, 2));

  try {
    const { property } = event;
    let userEmail = property.contactEmail;
    let userName = property.contactName;

    // If submittedBy is present (cognitoUserId), try to get user details from DynamoDB
    if (property.submittedBy) {
      try {
        // Query using GSI to find user by cognitoUserId
        const queryResult = await docClient.send(new QueryCommand({
          TableName: USER_TABLE_NAME,
          IndexName: 'cognitoUserId',
          KeyConditionExpression: 'cognitoUserId = :cognitoUserId',
          ExpressionAttributeValues: {
            ':cognitoUserId': property.submittedBy
          },
          Limit: 1
        }));

        if (queryResult.Items && queryResult.Items.length > 0) {
          const user = queryResult.Items[0];
          userEmail = user.email;
          userName = `${user.firstName} ${user.lastName}`;
        }
      } catch (error) {
        console.log('Could not fetch user details, using contact information');
      }
    }

    // Send email notification
    if (RESEND_API_KEY) {
      const emailData = {
        from: 'Luxury Homes <noreply@yourdomain.com>',
        to: userEmail,
        subject: 'Property Listing Submitted - Pending Approval',
        html: `
          <h2>Thank you for submitting your property listing!</h2>
          <p>Dear ${userName},</p>
          <p>We have received your property listing for <strong>${property.title}</strong>.</p>
          <p>Your listing is currently under review by our team. We will notify you once it has been approved and is live on our website.</p>
          <p>Property Details:</p>
          <ul>
            <li>Property ID: ${property.id}</li>
            <li>Title: ${property.title}</li>
            <li>Address: ${property.address}, ${property.city}, ${property.state} ${property.zipCode}</li>
            <li>Price: $${property.price.toLocaleString()}</li>
          </ul>
          <p>The review process typically takes 1-2 business days. You will receive an email notification once your listing has been approved.</p>
          <p>Thank you for choosing Luxury Homes!</p>
          <p>Best regards,<br>The Luxury Homes Team</p>
        `,
      };

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`);
      }

      console.log('Notification email sent successfully to:', userEmail);
    } else {
      console.log('RESEND_API_KEY not configured, skipping email notification');
    }

    return {
      success: true,
      message: `Property ${property.id} submitted successfully. Pending approval notification sent to ${userEmail}.`
    };

  } catch (error) {
    console.error('Error sending notification:', error);
    return {
      success: false,
      message: 'Failed to send notification',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};