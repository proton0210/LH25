import { Resend } from "resend";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

export interface SendProWelcomeEmailInput {
  cognitoUserId: string;
  updatedGroup: string;
}

const resend = new Resend("re_WNin6B7v_3QF8ARCP1ktzqWJjpiffqpXj");

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (
  event: SendProWelcomeEmailInput
): Promise<SendProWelcomeEmailInput & { emailSent: boolean }> => {
  console.log("Event received:", JSON.stringify(event, null, 2));

  const { cognitoUserId } = event;
  const userTableName = process.env.USER_TABLE_NAME;

  if (!userTableName) {
    throw new Error("USER_TABLE_NAME environment variable is not set");
  }

  try {
    // Fetch user details from DynamoDB
    const getUserCommand = new GetCommand({
      TableName: userTableName,
      Key: {
        cognitoUserId: cognitoUserId,
      },
    });

    const userResult = await docClient.send(getUserCommand);

    if (!userResult.Item) {
      console.error(
        `User not found in DynamoDB for cognitoUserId: ${cognitoUserId}`
      );
      return {
        ...event,
        emailSent: false,
      };
    }

    const user = userResult.Item;
    const toEmail = user.email as string;
    const name = user.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : user.email;

    const emailSubject = "Welcome to Lambda Real Estate Pro!";

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px; color: white; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px 0; }
    .pro-badge { display: inline-block; background: #FFD700; color: #333; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 16px; margin: 20px 0; }
    .benefits { background-color: #f8f9fa; padding: 25px; border-radius: 10px; margin: 25px 0; }
    .benefits h3 { color: #667eea; margin-top: 0; }
    .benefits ul { list-style: none; padding: 0; }
    .benefits li { padding: 10px 0; border-bottom: 1px solid #e9ecef; }
    .benefits li:last-child { border-bottom: none; }
    .benefits li:before { content: "✓ "; color: #28a745; font-weight: bold; font-size: 18px; }
    .ai-section { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 10px; margin: 25px 0; }
    .ai-section h3 { margin-top: 0; }
    .ai-section ul { list-style: none; padding: 0; }
    .ai-section li { padding: 8px 0; }
    .ai-section li:before { content: "🤖 "; font-size: 16px; }
    .cta { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
    .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Congratulations, ${name}!</h1>
      <div class="pro-badge">PRO MEMBER</div>
    </div>
    <div class="content">
      <p>You've successfully upgraded to <strong>Lambda Real Estate Pro</strong>! Welcome to our exclusive community of professional real estate users.</p>
      
      <div class="benefits">
        <h3>Your Pro Benefits Include:</h3>
        <ul>
          <li>Unlimited property listings</li>
          <li>Advanced search filters and saved searches</li>
          <li>Priority listing visibility</li>
          <li>Professional analytics dashboard</li>
          <li>Direct messaging with potential buyers/sellers</li>
          <li>Export property data and reports</li>
          <li>Early access to new features</li>
          <li>Dedicated pro user support</li>
        </ul>
      </div>

      <div class="ai-section">
        <h3>🚀 Exclusive AI Features Now Available!</h3>
        <p>As a Pro member, you now have access to our cutting-edge AI-powered features:</p>
        <ul>
          <li><strong>AI Property Analysis:</strong> Get instant insights on property values, market trends, and investment potential</li>
          <li><strong>Smart Search Recommendations:</strong> AI-powered suggestions based on your preferences and search history</li>
          <li><strong>Automated Market Reports:</strong> Generate comprehensive market analysis reports with a single click</li>
          <li><strong>Intelligent Property Matching:</strong> Find the perfect properties that match your exact criteria</li>
          <li><strong>AI Chat Assistant:</strong> Get instant answers to your real estate questions and guidance</li>
        </ul>
      </div>
      
      <p><strong>What's Next?</strong></p>
      <p>Log in to your account to explore all the pro features and AI capabilities now available to you. Your account has been automatically upgraded and all pro features are immediately accessible.</p>
      
      <div style="text-align: center;">
        <a href="#" class="cta">Explore Pro Features & AI Tools</a>
      </div>
      
      <p>If you have any questions about your pro membership, AI features, or need assistance getting started, our dedicated pro support team is here to help.</p>
    </div>
    <div class="footer">
      <p>Thank you for choosing Lambda Real Estate Pro!<br>The Lambda Real Estate Team</p>
      <p style="font-size: 12px; color: #999;">You're receiving this email because you upgraded your account to Pro status.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const textBody = `
Congratulations, ${name}!

You've successfully upgraded to Lambda Real Estate Pro! Welcome to our exclusive community of professional real estate users.

Your Pro Benefits Include:
✓ Unlimited property listings
✓ Advanced search filters and saved searches
✓ Priority listing visibility
✓ Professional analytics dashboard
✓ Direct messaging with potential buyers/sellers
✓ Export property data and reports
✓ Early access to new features
✓ Dedicated pro user support

🚀 Exclusive AI Features Now Available!
As a Pro member, you now have access to our cutting-edge AI-powered features:

🤖 AI Property Analysis: Get instant insights on property values, market trends, and investment potential
🤖 Smart Search Recommendations: AI-powered suggestions based on your preferences and search history
🤖 Automated Market Reports: Generate comprehensive market analysis reports with a single click
🤖 Intelligent Property Matching: Find the perfect properties that match your exact criteria
🤖 AI Chat Assistant: Get instant answers to your real estate questions and guidance

What's Next?
Log in to your account to explore all the pro features and AI capabilities now available to you. Your account has been automatically upgraded and all pro features are immediately accessible.

If you have any questions about your pro membership, AI features, or need assistance getting started, our dedicated pro support team is here to help.

Thank you for choosing Lambda Real Estate Pro!
The Lambda Real Estate Team
    `.trim();

    const response = await resend.emails.send({
      from: "Admin <admin@serverlesscreed.com>",
      to: [toEmail],
      subject: emailSubject,
      text: textBody,
      html: htmlBody,
    });

    console.log("Pro welcome email sent successfully:", response.data?.id);

    return {
      ...event,
      emailSent: true,
    };
  } catch (error) {
    console.error("Error sending pro welcome email:", error);
    // Don't fail the entire workflow if email fails
    return {
      ...event,
      emailSent: false,
    };
  }
};
