/**
 * Simple Plunk email test script that can be run with Node.js
 * Run with: node packages/mail/test-plunk.js
 */

// Load environment variables from .env.local
require("dotenv").config({ path: ".env.local" });

async function testPlunkEmail() {
	console.log("Starting Plunk email test...");

	// Check if required environment variables are set
	if (!process.env.PLUNK_API_KEY) {
		console.error(
			"❌ PLUNK_API_KEY is not defined in environment variables",
		);
		return;
	}

	// Check if using a public key instead of a secret key
	if (process.env.PLUNK_API_KEY.startsWith("pk_")) {
		console.error(
			"❌ You are using a Plunk public key (pk_) instead of a secret key (sk_).",
		);
		console.error(
			"Email sending requires a secret key. Please update your .env.local file.",
		);
		return;
	}

	try {
		// Prepare the request payload
		const payload = {
			to: process.env.MAIL_USER || "your-email@example.com", // Use MAIL_USER if available
			subject: "Test Email from Supastarter via Plunk",
			body: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h1 style="color: #4F46E5;">Test Email from Plunk</h1>
          <p>This is a test email to verify that the Plunk email sending functionality is working correctly.</p>
          <p>If you're seeing this, it means the Plunk configuration is working!</p>
          <div style="margin-top: 30px; padding: 10px; background-color: #f5f5f5; border-radius: 5px;">
            <p style="margin: 0;">Sent from Supastarter</p>
          </div>
        </div>
      `,
			text: "This is a test email to verify that the Plunk email sending functionality is working correctly.",
		};

		// Only add the from email if it's configured
		if (process.env.PLUNK_FROM_EMAIL) {
			payload.from = process.env.PLUNK_FROM_EMAIL;
			console.log(
				`Using custom from email: ${process.env.PLUNK_FROM_EMAIL}`,
			);
		}

		console.log(`Sending test email to ${payload.to}...`);

		// Make the API request to Plunk
		const response = await fetch("https://api.useplunk.com/v1/send", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.PLUNK_API_KEY}`,
			},
			body: JSON.stringify(payload),
		});

		// Get the response data
		const responseData = await response.json();

		// Handle unsuccessful responses
		if (!response.ok) {
			console.error("❌ Email sending failed:", {
				status: response.status,
				statusText: response.statusText,
				responseData,
			});

			// Check for common errors
			if (response.status === 401) {
				console.error(
					"Authentication failed: Invalid Plunk API key or insufficient permissions",
				);
			} else if (
				response.status === 403 &&
				responseData.message?.includes("from")
			) {
				console.error(
					"The from email address is not verified in your Plunk account",
				);
			} else {
				console.error(
					`Could not send email: ${response.status} ${response.statusText}`,
				);
			}
			return;
		}

		// Log success
		console.log("✅ Email sent successfully via Plunk!");
		console.log("Response:", responseData);
	} catch (error) {
		console.error(
			"❌ Exception while sending email via Plunk:",
			error.message,
		);
	}
}

// Run the test
testPlunkEmail();
