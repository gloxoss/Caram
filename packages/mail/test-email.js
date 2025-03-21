/**
 * Enhanced email test script that can be run with Node.js
 * Tests both Nodemailer and Plunk email providers
 * Run with: node packages/mail/test-email.js
 * 
 * Usage:
 * - To test Nodemailer: node packages/mail/test-email.js nodemailer
 * - To test Plunk: node packages/mail/test-email.js plunk
 * - To test both: node packages/mail/test-email.js
 */

// Load environment variables from .env.local
require("dotenv").config({ path: ".env.local" });

const nodemailer = require("nodemailer");
const axios = require("axios");

// Get the test mode from command line arguments
const args = process.argv.slice(2);
const testMode = args[0]?.toLowerCase() || "both";
const testEmail = args[1] || process.env.MAIL_USER || "test@example.com";

async function testNodemailer() {
	console.log("\n🔍 TESTING NODEMAILER CONFIGURATION");
	console.log("================================");

	// Check if required environment variables are set
	if (
		!process.env.MAIL_HOST ||
		!process.env.MAIL_PORT ||
		!process.env.MAIL_USER ||
		!process.env.MAIL_PASS
	) {
		console.error(
			"❌ Nodemailer configuration is incomplete. Please check your .env.local file.",
		);
		console.log(
			"Required variables: MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS",
		);
		return false;
	}

	console.log("📧 Nodemailer Configuration:");
	console.log(`- Host: ${process.env.MAIL_HOST}`);
	console.log(`- Port: ${process.env.MAIL_PORT}`);
	console.log(`- User: ${process.env.MAIL_USER}`);
	console.log(`- Secure: ${Number.parseInt(process.env.MAIL_PORT, 10) === 465 ? "Yes" : "No"}`);

	try {
		// Create a transporter
		const transporter = nodemailer.createTransport({
			host: process.env.MAIL_HOST,
			port: Number.parseInt(process.env.MAIL_PORT, 10),
			secure: Number.parseInt(process.env.MAIL_PORT, 10) === 465, // true for 465, false for other ports
			auth: {
				user: process.env.MAIL_USER,
				pass: process.env.MAIL_PASS,
			},
		});

		// Verify connection
		console.log("\nVerifying SMTP connection...");
		await transporter.verify();
		console.log("✅ SMTP connection verified successfully");

		// Send test email
		console.log(`\nSending test email to ${testEmail}...`);
		const info = await transporter.sendMail({
			from: process.env.MAIL_FROM || process.env.MAIL_USER,
			to: testEmail,
			subject: "Test Email from Supastarter (Nodemailer)",
			text: "This is a test email to verify that the Nodemailer email sending functionality is working correctly.",
			html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h1 style="color: #4F46E5;">Nodemailer Test Email</h1>
          <p>This is a test email to verify that the Nodemailer email sending functionality is working correctly.</p>
          <p>If you're seeing this, it means the email configuration is working!</p>
          <div style="margin-top: 30px; padding: 10px; background-color: #f5f5f5; border-radius: 5px;">
            <p style="margin: 0;">Sent from Supastarter</p>
          </div>
        </div>
      `,
		});

		console.log("✅ Email sent successfully!");
		console.log("Message ID:", info.messageId);
		if (nodemailer.getTestMessageUrl && info) {
			console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
		}
		return true;
	} catch (error) {
		console.error("❌ Error sending email with Nodemailer:", error.message);

		// Provide helpful troubleshooting tips based on the error
		if (error.code === "EAUTH" || error.message.includes("Invalid login")) {
			console.log("\nTroubleshooting tips for authentication errors:");
			console.log(
				"1. If using Gmail, make sure you're using an App Password, not your regular password",
			);
			console.log(
				"2. Verify that your email and password are correct in .env.local",
			);
			console.log(
				"3. For Gmail, ensure 2-Step Verification is enabled in your Google account and generate an App Password at https://myaccount.google.com/apppasswords",
			);
		} else if (error.code === "ESOCKET" || error.code === "ECONNECTION") {
			console.log("\nTroubleshooting tips for connection errors:");
			console.log("1. Check if your MAIL_HOST and MAIL_PORT are correct");
			console.log(
				"2. Ensure your network allows connections to the mail server",
			);
			console.log("3. Check if your mail provider requires SSL/TLS");
		}
		return false;
	}
}

async function testPlunk() {
	console.log("\n🔍 TESTING PLUNK CONFIGURATION");
	console.log("============================");

	// Check if required environment variables are set
	if (!process.env.PLUNK_API_KEY) {
		console.error(
			"❌ Plunk configuration is incomplete. Please check your .env.local file.",
		);
		console.log("Required variables: PLUNK_API_KEY");
		return false;
	}

	try {
		console.log(`Sending test email to ${testEmail} via Plunk API...`);
		
		// Determine the from email address
		const fromEmail = process.env.MAIL_FROM || "hello@useplunk.com";
		console.log(`- Using from email: ${fromEmail}`);
		
		// Make API request to Plunk
		const response = await axios.post(
			"https://api.useplunk.com/v1/send",
			{
				to: testEmail,
				subject: "Test Email from Supastarter (Plunk)",
				body: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h1 style="color: #4F46E5;">Plunk Test Email</h1>
            <p>This is a test email to verify that the Plunk email sending functionality is working correctly.</p>
            <p>If you're seeing this, it means the email configuration is working!</p>
            <div style="margin-top: 30px; padding: 10px; background-color: #f5f5f5; border-radius: 5px;">
              <p style="margin: 0;">Sent from Supastarter</p>
            </div>
          </div>
        `,
				from: fromEmail,
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.PLUNK_API_KEY}`,
					"Content-Type": "application/json",
				},
			},
		);

		console.log("✅ Email sent successfully via Plunk!");
		console.log("Response:", response.data);
		return true;
	} catch (error) {
		console.error("❌ Error sending email with Plunk:", error.message);
		
		if (error.response) {
			console.log("Error details:", error.response.data);
			
			// Provide troubleshooting tips based on the error
			if (error.response.status === 401) {
				console.log("\nTroubleshooting tips for Plunk authentication errors:");
				console.log("1. Verify your PLUNK_API_KEY is correct in .env.local");
				console.log("2. Make sure your Plunk account is active and in good standing");
			}
			
			if (error.response.data?.message?.includes("Verify your domain")) {
				console.log("\nDomain verification issue:");
				console.log("1. You need to verify your domain with Plunk before using a custom from address");
				console.log("2. Either verify your domain in the Plunk dashboard or use the default Plunk email address");
				console.log("3. Set MAIL_FROM to hello@useplunk.com in your .env.local file as a temporary solution");
			}
		}
		return false;
	}
}

async function runTests() {
	console.log("🚀 Starting email configuration tests...");
	
	let nodemailerSuccess = false;
	let plunkSuccess = false;
	
	if (testMode === "both" || testMode === "nodemailer") {
		nodemailerSuccess = await testNodemailer();
	}
	
	if (testMode === "both" || testMode === "plunk") {
		plunkSuccess = await testPlunk();
	}
	
	console.log("\n📊 TEST RESULTS SUMMARY");
	console.log("=====================");
	if (testMode === "both" || testMode === "nodemailer") {
		console.log(`Nodemailer: ${nodemailerSuccess ? '✅ PASSED' : '❌ FAILED'}`);
	}
	if (testMode === "both" || testMode === "plunk") {
		console.log(`Plunk: ${plunkSuccess ? '✅ PASSED' : '❌ FAILED'}`);
	}
	
	if (testMode === "both") {
		if (nodemailerSuccess || plunkSuccess) {
			console.log("\n✅ At least one email provider is working correctly!");
		} else {
			console.log("\n❌ All email providers failed. Please check the configuration.");
		}
	}
	
	console.log("\n📝 RECOMMENDED FIXES:");
	if (!nodemailerSuccess && (testMode === "both" || testMode === "nodemailer")) {
		if (process.env.MAIL_HOST === "smtp.gmail.com") {
			console.log("For Gmail:");
			console.log("1. Enable 2-Step Verification in your Google account");
			console.log("2. Generate an App Password at https://myaccount.google.com/apppasswords");
			console.log("3. Use the generated App Password in your MAIL_PASS environment variable");
		} else {
			console.log("For Nodemailer:");
			console.log("1. Verify your MAIL_HOST, MAIL_PORT, MAIL_USER, and MAIL_PASS are correct");
			console.log("2. Check if your email provider requires special configuration");
		}
	}
	
	if (!plunkSuccess && (testMode === "both" || testMode === "plunk")) {
		console.log("For Plunk:");
		console.log("1. Verify your PLUNK_API_KEY is correct");
		console.log("2. If using a custom from address, verify your domain in the Plunk dashboard");
		console.log("3. As a temporary solution, set MAIL_FROM=hello@useplunk.com in your .env.local file");
	}
}

// Run the tests
runTests();
