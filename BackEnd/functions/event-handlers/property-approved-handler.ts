import { EventBridgeHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Resend } from 'resend';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const USER_TABLE_NAME = process.env.USER_TABLE_NAME!;
const resend = new Resend(process.env.RESEND_API_KEY || 're_WNin6B7v_3QF8ARCP1ktzqWJjpiffqpXj');

interface PropertyApprovedEvent {
  propertyId: string;
  approvedBy: string;
  approvedAt: string;
  property: {
    id: string;
    title: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    price: number;
    propertyType: string;
    listingType: string;
    contactEmail: string;
    contactName: string;
  };
  submittedBy?: string;
  userEmail: string;
  userName: string;
}

export const handler: EventBridgeHandler<'Property Approved', PropertyApprovedEvent, void> = async (event) => {
  console.log('Property Approved Event received:', JSON.stringify(event, null, 2));

  const { detail } = event;

  try {
    // Get user details if cognitoUserId is provided
    let userEmail = detail.userEmail || detail.property.contactEmail;
    let userName = detail.userName || detail.property.contactName;
    
    if (detail.submittedBy && USER_TABLE_NAME) {
      try {
        const userQueryCommand = new QueryCommand({
          TableName: USER_TABLE_NAME,
          IndexName: "cognitoUserId",
          KeyConditionExpression: "cognitoUserId = :cognitoUserId",
          ExpressionAttributeValues: {
            ":cognitoUserId": detail.submittedBy
          },
          Limit: 1
        });
        
        const userQueryResult = await docClient.send(userQueryCommand);
        
        if (userQueryResult.Items && userQueryResult.Items.length > 0) {
          const user = userQueryResult.Items[0];
          userEmail = user.email || userEmail;
          userName = `${user.firstName} ${user.lastName}` || userName;
        }
      } catch (userError) {
        console.error('Error fetching user details:', userError);
        // Continue with existing email/name
      }
    }
    
    // Send approval email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1a1a1a; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Property Approved! 🎉</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <p>Dear ${userName},</p>
          <p>Great news! Your property listing has been approved and is now live on our platform.</p>
          
          <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4CAF50;">
            <h3 style="margin-top: 0; color: #333;">Property Details:</h3>
            <p><strong>Title:</strong> ${detail.property.title}</p>
            <p><strong>Address:</strong> ${detail.property.address}, ${detail.property.city}, ${detail.property.state} ${detail.property.zipCode}</p>
            <p><strong>Price:</strong> $${detail.property.price.toLocaleString()}</p>
            <p><strong>Type:</strong> ${detail.property.propertyType}</p>
            <p><strong>Listing Type:</strong> ${detail.property.listingType}</p>
          </div>
          
          <p>Your property is now visible to all users on our platform. You can view and manage your listing by logging into your account.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://luxuryhousing.com/my-listings" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View My Listings</a>
          </div>
          
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>The Luxury Housing Team</p>
        </div>
        <div style="background-color: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2025 Luxury Housing. All rights reserved.</p>
        </div>
      </div>
    `;
    
    const emailText = `
      Dear ${userName},
      
      Great news! Your property listing has been approved and is now live on our platform.
      
      Property Details:
      Title: ${detail.property.title}
      Address: ${detail.property.address}, ${detail.property.city}, ${detail.property.state} ${detail.property.zipCode}
      Price: $${detail.property.price.toLocaleString()}
      Type: ${detail.property.propertyType}
      Listing Type: ${detail.property.listingType}
      
      Your property is now visible to all users on our platform. You can view and manage your listing by logging into your account.
      
      If you have any questions, please don't hesitate to contact our support team.
      
      Best regards,
      The Luxury Housing Team
    `;
    
    await resend.emails.send({
      from: 'Admin <admin@serverlesscreed.com>',
      to: userEmail,
      subject: 'Your Property Has Been Approved! 🎉',
      html: emailHtml,
      text: emailText,
    });
    
    console.log('Approval email sent successfully to:', userEmail);
    console.log('Property approved event processed successfully');
  } catch (error) {
    console.error('Error processing property approved event:', error);
    throw error;
  }
};