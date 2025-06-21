import { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Resend } from 'resend';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME!;
const USER_TABLE_NAME = process.env.USER_TABLE_NAME!;
const resend = new Resend(process.env.RESEND_API_KEY || 're_WNin6B7v_3QF8ARCP1ktzqWJjpiffqpXj');

interface RejectPropertyArgs {
  id: string;
  reason: string;
}

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  propertyType: string;
  listingType: string;
  images: string[];
  submittedBy?: string;
  submittedAt: string;
  updatedAt: string;
  status: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  amenities?: string[];
  yearBuilt?: number;
  lotSize?: number;
  parkingSpaces?: number;
  isPublic: boolean;
}

export const handler: AppSyncResolverHandler<RejectPropertyArgs, Property> = async (event) => {
  console.log('RejectProperty event:', JSON.stringify(event, null, 2));

  const { id, reason } = event.arguments;
  const identity = event.identity as any;

  if (!id || !reason) {
    throw new Error('Property ID and rejection reason are required');
  }

  // Verify admin access
  const isAdmin = identity.groups && identity.groups.includes('admin');
  if (!isAdmin) {
    throw new Error('Only administrators can reject properties');
  }

  try {
    // First, get the existing property
    const getResult = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `PROPERTY#${id}`,
        sk: `PROPERTY#${id}`,
      },
    }));

    if (!getResult.Item) {
      throw new Error('Property not found');
    }

    if (getResult.Item.status === 'REJECTED') {
      throw new Error('Property is already rejected');
    }

    const now = new Date().toISOString();
    const rejectedBy = identity.username || identity.userArn;

    // Update property status to REJECTED
    const updateResult = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `PROPERTY#${id}`,
        sk: `PROPERTY#${id}`,
      },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt, #rejectedAt = :rejectedAt, #rejectedBy = :rejectedBy, #rejectionReason = :reason, #gsi1pk = :gsi1pk, #gsi1sk = :gsi1sk, #isPublic = :isPublic',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
        '#rejectedAt': 'rejectedAt',
        '#rejectedBy': 'rejectedBy',
        '#rejectionReason': 'rejectionReason',
        '#gsi1pk': 'gsi1pk',
        '#gsi1sk': 'gsi1sk',
        '#isPublic': 'isPublic',
      },
      ExpressionAttributeValues: {
        ':status': 'REJECTED',
        ':updatedAt': now,
        ':rejectedAt': now,
        ':rejectedBy': rejectedBy,
        ':reason': reason,
        ':gsi1pk': 'STATUS#REJECTED',
        ':gsi1sk': `SUBMITTED#${getResult.Item.submittedAt}`,
        ':isPublic': false, // Make rejected properties private
      },
      ReturnValues: 'ALL_NEW',
    }));

    // Clean up the property object
    const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, gsi3pk, gsi3sk, gsi4pk, gsi4sk, gsi5pk, gsi5sk, ...property } = updateResult.Attributes!;
    
    // Send rejection email notification
    try {
      // Get user details from cognitoUserId (submittedBy field)
      const cognitoUserId = getResult.Item.submittedBy;
      let userEmail = property.contactEmail;
      let userName = property.contactName;
      
      if (cognitoUserId) {
        // Try to get user details from user table
        const userQueryCommand = new QueryCommand({
          TableName: USER_TABLE_NAME,
          IndexName: "cognitoUserId",
          KeyConditionExpression: "cognitoUserId = :cognitoUserId",
          ExpressionAttributeValues: {
            ":cognitoUserId": cognitoUserId
          },
          Limit: 1
        });
        
        const userQueryResult = await docClient.send(userQueryCommand);
        
        if (userQueryResult.Items && userQueryResult.Items.length > 0) {
          const user = userQueryResult.Items[0];
          userEmail = user.email || userEmail;
          userName = `${user.firstName} ${user.lastName}` || userName;
        }
      }
      
      // Send rejection email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1a1a1a; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Property Review Update</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Dear ${userName},</p>
            <p>Thank you for submitting your property listing. After careful review, we regret to inform you that your property listing has not been approved at this time.</p>
            
            <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #f44336;">
              <h3 style="margin-top: 0; color: #333;">Property Details:</h3>
              <p><strong>Title:</strong> ${property.title}</p>
              <p><strong>Address:</strong> ${property.address}, ${property.city}, ${property.state} ${property.zipCode}</p>
              <p><strong>Price:</strong> $${property.price.toLocaleString()}</p>
              <p><strong>Type:</strong> ${property.propertyType}</p>
              <p><strong>Listing Type:</strong> ${property.listingType}</p>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ffc107;">
              <h4 style="margin-top: 0; color: #856404;">Reason for Rejection:</h4>
              <p style="color: #856404; margin: 0;">${reason}</p>
            </div>
            
            <p>We encourage you to review the feedback above and make the necessary adjustments to your listing. You can edit your property details and resubmit for approval.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://luxuryhousing.com/my-listings" style="background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Edit My Listing</a>
            </div>
            
            <p>If you have any questions or need assistance with your listing, please don't hesitate to contact our support team.</p>
            
            <p>Best regards,<br>The Luxury Housing Team</p>
          </div>
          <div style="background-color: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>© 2025 Luxury Housing. All rights reserved.</p>
          </div>
        </div>
      `;
      
      const emailText = `
        Dear ${userName},
        
        Thank you for submitting your property listing. After careful review, we regret to inform you that your property listing has not been approved at this time.
        
        Property Details:
        Title: ${property.title}
        Address: ${property.address}, ${property.city}, ${property.state} ${property.zipCode}
        Price: $${property.price.toLocaleString()}
        Type: ${property.propertyType}
        Listing Type: ${property.listingType}
        
        Reason for Rejection:
        ${reason}
        
        We encourage you to review the feedback above and make the necessary adjustments to your listing. You can edit your property details and resubmit for approval.
        
        If you have any questions or need assistance with your listing, please don't hesitate to contact our support team.
        
        Best regards,
        The Luxury Housing Team
      `;
      
      await resend.emails.send({
        from: 'Admin <admin@serverlesscreed.com>',
        to: userEmail,
        subject: 'Property Listing Review Update',
        html: emailHtml,
        text: emailText,
      });
      
      console.log('Rejection email sent successfully to:', userEmail);
    } catch (emailError) {
      console.error('Error sending rejection email:', emailError);
      // Don't throw error - email failure shouldn't prevent property rejection
    }
    
    console.log('Property rejected successfully:', id);
    return property as Property;
  } catch (error) {
    console.error('Error rejecting property:', error);
    throw error;
  }
};