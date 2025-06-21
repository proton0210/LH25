import { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Resend } from 'resend';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = process.env.PROPERTIES_TABLE_NAME!;
const USER_TABLE_NAME = process.env.USER_TABLE_NAME!;
const resend = new Resend(process.env.RESEND_API_KEY || 're_WNin6B7v_3QF8ARCP1ktzqWJjpiffqpXj');

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

export const handler: AppSyncResolverHandler<{ id: string }, Property> = async (event) => {
  console.log('ApproveProperty event:', JSON.stringify(event, null, 2));

  const { id } = event.arguments;
  const identity = event.identity as any;

  if (!id) {
    throw new Error('Property ID is required');
  }

  // Verify admin access
  const isAdmin = identity.groups && identity.groups.includes('admin');
  if (!isAdmin) {
    throw new Error('Only administrators can approve properties');
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

    if (getResult.Item.status === 'ACTIVE') {
      throw new Error('Property is already approved');
    }

    const now = new Date().toISOString();
    const approvedBy = identity.username || identity.userArn;

    // Update property status to ACTIVE
    const updateResult = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `PROPERTY#${id}`,
        sk: `PROPERTY#${id}`,
      },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt, #approvedAt = :approvedAt, #approvedBy = :approvedBy, #gsi1pk = :gsi1pk, #gsi1sk = :gsi1sk',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
        '#approvedAt': 'approvedAt',
        '#approvedBy': 'approvedBy',
        '#gsi1pk': 'gsi1pk',
        '#gsi1sk': 'gsi1sk',
      },
      ExpressionAttributeValues: {
        ':status': 'ACTIVE',
        ':updatedAt': now,
        ':approvedAt': now,
        ':approvedBy': approvedBy,
        ':gsi1pk': 'STATUS#ACTIVE',
        ':gsi1sk': `SUBMITTED#${getResult.Item.submittedAt}`,
      },
      ReturnValues: 'ALL_NEW',
    }));

    // Clean up the property object
    const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, gsi3pk, gsi3sk, gsi4pk, gsi4sk, gsi5pk, gsi5sk, ...property } = updateResult.Attributes!;
    
    // Send approval email notification
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
              <p><strong>Title:</strong> ${property.title}</p>
              <p><strong>Address:</strong> ${property.address}, ${property.city}, ${property.state} ${property.zipCode}</p>
              <p><strong>Price:</strong> $${property.price.toLocaleString()}</p>
              <p><strong>Type:</strong> ${property.propertyType}</p>
              <p><strong>Listing Type:</strong> ${property.listingType}</p>
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
        Title: ${property.title}
        Address: ${property.address}, ${property.city}, ${property.state} ${property.zipCode}
        Price: $${property.price.toLocaleString()}
        Type: ${property.propertyType}
        Listing Type: ${property.listingType}
        
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
    } catch (emailError) {
      console.error('Error sending approval email:', emailError);
      // Don't throw error - email failure shouldn't prevent property approval
    }
    
    console.log('Property approved successfully:', id);
    return property as Property;
  } catch (error) {
    console.error('Error approving property:', error);
    throw error;
  }
};