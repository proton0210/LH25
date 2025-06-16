import { PostAuthenticationTriggerEvent } from "aws-lambda";
import { Resend } from "resend";

const resend = new Resend("re_WNin6B7v_3QF8ARCP1ktzqWJjpiffqpXj");

export const handler = async (event: PostAuthenticationTriggerEvent) => {
  console.log("Event received:", JSON.stringify(event, null, 2));
  try {
    // Check if this is a password change event
    const isPasswordChange =
      event.request.userAttributes["custom:password_changed"] === "true";

    if (isPasswordChange) {
      console.log("Password change detected for user:", event.userName);

      const toEmail = event.request.userAttributes.email;
      const firstName = event.request.userAttributes["custom:firstName"];
      const lastName = event.request.userAttributes["custom:lastName"];
      const name = firstName
        ? `${firstName} ${lastName || ""}`.trim()
        : toEmail;

      const emailSubject = "Your Lambda Real Estate Password Has Been Changed";

      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
    .content { padding: 20px 0; }
    .warning { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Change Notification</h1>
    </div>
    <div class="content">
      <p>Hello ${name},</p>
      <p>This email is to confirm that your Lambda Real Estate account password was recently changed.</p>
      
      <div class="warning">
        <h3>Important Security Information:</h3>
        <p>If you did not make this change, please contact our support team immediately.</p>
      </div>
      
      <p>Time of change: ${new Date().toLocaleString()}</p>
      <p>If you made this change, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>The Lambda Real Estate Security Team</p>
    </div>
  </div>
</body>
</html>
      `.trim();

      const textBody = `
Hello ${name},

This email is to confirm that your Lambda Real Estate account password was recently changed.

Important Security Information:
If you did not make this change, please contact our support team immediately.

Time of change: ${new Date().toLocaleString()}

If you made this change, you can safely ignore this email.

Best regards,
The Lambda Real Estate Security Team
      `.trim();

      try {
        const response = await resend.emails.send({
          from: "Security <security@serverlesscreed.com>",
          to: [toEmail],
          subject: emailSubject,
          text: textBody,
          html: htmlBody,
        });

        console.log(
          "Password change notification sent successfully:",
          response.data?.id
        );
      } catch (error) {
        console.error("Error sending password change notification:", error);
        // Don't fail the authentication if email fails
      }
    }

    return event;
  } catch (error) {
    console.error("Error in post-password-change handler:", error);
    throw error;
  }
};
