import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Resend } from 'resend';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const USER_TABLE_NAME = process.env.USER_TABLE_NAME!;

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY || 're_WNin6B7v_3QF8ARCP1ktzqWJjpiffqpXj');

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
    let isAuthenticatedUser = false;

    // If submittedBy is present (cognitoUserId), fetch user details from DynamoDB
    // This ensures we send email to the authenticated user's registered email
    if (property.submittedBy) {
      try {
        console.log(`Fetching user details for cognitoUserId: ${property.submittedBy}`);
        
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
          userEmail = user.email; // Use the registered email from user profile
          userName = `${user.firstName} ${user.lastName}`;
          isAuthenticatedUser = true;
          console.log(`Found user: ${userName} (${userEmail})`);
        } else {
          console.log('User not found in database, using contact information');
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
        console.log('Falling back to contact information');
      }
    } else {
      console.log('No authenticated user, using contact information from property');
    }

    // Send email notification
    try {
      // Customize greeting based on user type
      const greeting = isAuthenticatedUser 
        ? `Dear ${userName}`
        : `Dear ${userName}`;
      
      const accountInfo = isAuthenticatedUser
        ? `<p>You can track the status of all your listings in your account dashboard.</p>`
        : `<p>If you have an account with us, you can log in to track your listing status.</p>`;

      const emailSubject = 'Property Listing Submitted - Pending Approval';
      
      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1a365d; color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { padding: 30px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 0 0 5px 5px; }
    .property-details { background-color: #f7fafc; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; }
    .highlight { color: #2b6cb0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Property Listing Submitted</h1>
    </div>
    <div class="content">
      <p>${greeting},</p>
      <p>We have successfully received your property listing for <strong>${property.title}</strong>.</p>
      <p>Your listing is currently under review by our team. We will notify you at <span class="highlight">${userEmail}</span> once it has been approved and is live on our website.</p>
      
      <div class="property-details">
        <h3>Property Details:</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Property ID:</strong> ${property.id}</li>
          <li><strong>Title:</strong> ${property.title}</li>
          <li><strong>Address:</strong> ${property.address}, ${property.city}, ${property.state} ${property.zipCode}</li>
          <li><strong>Price:</strong> $${property.price.toLocaleString()}</li>
          <li><strong>Bedrooms:</strong> ${property.bedrooms}</li>
          <li><strong>Bathrooms:</strong> ${property.bathrooms}</li>
          <li><strong>Square Feet:</strong> ${property.squareFeet.toLocaleString()}</li>
          <li><strong>Property Type:</strong> ${property.propertyType}</li>
          <li><strong>Listing Type:</strong> ${property.listingType}</li>
        </ul>
      </div>
      
      ${accountInfo}
      <p>The review process typically takes 1-2 business days. You will receive an email notification once your listing has been approved.</p>
      
      <p>If you have any questions, please don't hesitate to contact our support team.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br><strong>The Lambda Real Estate Team</strong></p>
      <p style="font-size: 12px; color: #999;">This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`.trim();

      const textBody = `
${greeting},

We have successfully received your property listing for "${property.title}".

Your listing is currently under review by our team. We will notify you at ${userEmail} once it has been approved and is live on our website.

Property Details:
- Property ID: ${property.id}
- Title: ${property.title}
- Address: ${property.address}, ${property.city}, ${property.state} ${property.zipCode}
- Price: $${property.price.toLocaleString()}
- Bedrooms: ${property.bedrooms}
- Bathrooms: ${property.bathrooms}
- Square Feet: ${property.squareFeet.toLocaleString()}
- Property Type: ${property.propertyType}
- Listing Type: ${property.listingType}

The review process typically takes 1-2 business days. You will receive an email notification once your listing has been approved.

If you have any questions, please don't hesitate to contact our support team.

Best regards,
The Lambda Real Estate Team
`.trim();

      const response = await resend.emails.send({
        from: 'Admin <admin@serverlesscreed.com>',
        to: [userEmail],
        subject: emailSubject,
        text: textBody,
        html: htmlBody,
      });

      console.log('Notification email sent successfully:', response.data?.id);
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't fail the entire workflow if email fails
    }

    const emailSource = isAuthenticatedUser ? 'user profile' : 'contact form';
    console.log(`Notification sent successfully to ${userEmail} (from ${emailSource})`);
    
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