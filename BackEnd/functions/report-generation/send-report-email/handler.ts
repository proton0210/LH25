import { Resend } from "resend";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const resend = new Resend("re_WNin6B7v_3QF8ARCP1ktzqWJjpiffqpXj");
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export interface SendReportEmailInput {
  reportId: string;
  userId: string;
  cognitoUserId?: string;
  input: {
    title: string;
    reportType: string;
    propertyType: string;
    city: string;
    state: string;
  };
  s3Key: string;
  s3Url: string;
  signedUrl: string;
  generationTimeMs: number;
}

export const handler = async (event: SendReportEmailInput): Promise<SendReportEmailInput & { emailSent: boolean }> => {
  console.log("Sending report ready email for report:", event.reportId);
  
  const userTableName = process.env.USER_TABLE_NAME;
  
  if (!userTableName) {
    throw new Error("USER_TABLE_NAME environment variable is not set");
  }
  
  try {
    let userEmail = "";
    let userName = "";
    
    // Fetch user details from DynamoDB
    if (event.cognitoUserId && event.cognitoUserId !== "anonymous") {
      const queryCommand = new QueryCommand({
        TableName: userTableName,
        IndexName: "cognitoUserId",
        KeyConditionExpression: "cognitoUserId = :cognitoUserId",
        ExpressionAttributeValues: {
          ":cognitoUserId": event.cognitoUserId
        }
      });
      
      const queryResult = await docClient.send(queryCommand);
      
      if (queryResult.Items && queryResult.Items.length > 0) {
        const user = queryResult.Items[0];
        userEmail = user.email;
        userName = user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user.email;
      }
    }
    
    if (!userEmail) {
      console.error("Could not find user email for cognitoUserId:", event.cognitoUserId);
      return {
        ...event,
        emailSent: false
      };
    }
    
    // Format report type for display
    const reportTypeDisplay = event.input.reportType.replace(/_/g, " ").toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
    
    const emailSubject = `Your ${reportTypeDisplay} Report is Ready - ${event.input.title}`;
    
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px; color: white; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px 0; }
    .property-card { background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }
    .property-card h3 { color: #667eea; margin-top: 0; }
    .property-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; }
    .property-details dt { font-weight: bold; color: #666; }
    .property-details dd { margin: 0; color: #333; }
    .cta-button { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }
    .cta-button:hover { background: #5a67d8; }
    .ai-badge { display: inline-block; background: #f0f7ff; color: #667eea; padding: 5px 15px; border-radius: 20px; font-size: 14px; margin: 10px 0; }
    .warning { background: #fff5f5; border-left: 4px solid #feb2b2; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Your Property Report is Ready!</h1>
      <div class="ai-badge">🤖 AI-Powered Analysis</div>
    </div>
    
    <div class="content">
      <p>Hi ${userName},</p>
      
      <p>Great news! Your <strong>${reportTypeDisplay}</strong> report has been generated and is ready for viewing.</p>
      
      <div class="property-card">
        <h3>${event.input.title}</h3>
        <dl class="property-details">
          <dt>Property Type:</dt>
          <dd>${event.input.propertyType.replace(/_/g, " ")}</dd>
          <dt>Location:</dt>
          <dd>${event.input.city}, ${event.input.state}</dd>
          <dt>Report Type:</dt>
          <dd>${reportTypeDisplay}</dd>
          <dt>Generated:</dt>
          <dd>${new Date().toLocaleString()}</dd>
        </dl>
      </div>
      
      <p><strong>What's in your report?</strong></p>
      <ul>
        <li>Comprehensive market analysis</li>
        <li>Neighborhood amenities & infrastructure details</li>
        <li>Professional recommendations</li>
        <li>AI-powered insights specific to your property</li>
      </ul>
      
      <div style="text-align: center;">
        <a href="${event.signedUrl}" class="cta-button">📄 View Your Report</a>
      </div>
      
      <div class="warning">
        <strong>⏰ Important:</strong> This link will expire in 1 hour for security reasons. Please download the report if you need to keep it for future reference.
      </div>
      
      <p><strong>Where to find your reports later?</strong></p>
      <p>All your generated reports are automatically saved in your account under <strong>"My Reports"</strong> section. You can access them anytime by logging into your Lambda Real Estate Pro account.</p>
    </div>
    
    <div class="footer">
      <p>This report was generated using Claude AI by Anthropic, providing you with cutting-edge real estate insights.</p>
      <p>© Lambda Real Estate Pro | <a href="#" style="color: #667eea;">View in My Reports</a></p>
      <p style="font-size: 12px; color: #999;">You're receiving this email because you requested a property report.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
    
    const textBody = `
Hi ${userName},

Your ${reportTypeDisplay} Report is Ready!

Property: ${event.input.title}
Location: ${event.input.city}, ${event.input.state}
Report Type: ${reportTypeDisplay}

View your report here: ${event.signedUrl}

⏰ Important: This link will expire in 1 hour. Please download the report if you need to keep it.

What's in your report?
- Comprehensive market analysis
- Neighborhood amenities & infrastructure details
- Professional recommendations
- AI-powered insights specific to your property

You can also find all your reports in the "My Reports" section of your account.

Best regards,
The Lambda Real Estate Pro Team
    `.trim();
    
    const response = await resend.emails.send({
      from: "Admin <admin@serverlesscreed.com>",
      to: [userEmail],
      subject: emailSubject,
      text: textBody,
      html: htmlBody,
    });
    
    console.log("Report ready email sent successfully:", response.data?.id);
    
    return {
      ...event,
      emailSent: true
    };
    
  } catch (error) {
    console.error("Error sending report ready email:", error);
    // Don't fail the workflow if email fails
    return {
      ...event,
      emailSent: false
    };
  }
};