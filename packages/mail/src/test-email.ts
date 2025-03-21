/**
 * This is a simple test script to verify that email sending is working correctly.
 * You can run it with: npx tsx packages/mail/src/test-email.ts
 */

import { logger } from "@repo/logs";
import { sendEmail } from "../src/util/send";

async function testEmailSending() {
	try {
		logger.info("Starting email test...");

		const result = await sendEmail({
			to: "zakiossama29@gmail.com", // Replace with your email
			subject: "Test Email from Supastarter",
			text: "This is a test email to verify that the email sending functionality is working correctly.",
			html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h1 style="color: #4F46E5;">Test Email</h1>
          <p>This is a test email to verify that the email sending functionality is working correctly.</p>
          <p>If you're seeing this, it means the email configuration is working!</p>
          <div style="margin-top: 30px; padding: 10px; background-color: #f5f5f5; border-radius: 5px;">
            <p style="margin: 0;">Sent from Supastarter</p>
          </div>
        </div>
      `,
		});

		if (result) {
			logger.info("✅ Test email sent successfully!");
		} else {
			logger.error("❌ Failed to send test email");
		}
	} catch (error) {
		logger.error("❌ Error during test:", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
	}
}

// Run the test
testEmailSending();
