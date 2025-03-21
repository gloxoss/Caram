import { logger } from "@repo/logs";
import type { SendEmailHandler } from "../../types";

export const send: SendEmailHandler = async ({ to, subject, html, text }) => {
	try {
		// Check if Plunk API key is configured
		if (!process.env.PLUNK_API_KEY) {
			logger.error(
				"PLUNK_API_KEY is not defined in environment variables",
			);
			throw new Error("PLUNK_API_KEY is missing");
		}

		// Check if using a public key instead of a secret key
		if (process.env.PLUNK_API_KEY.startsWith("pk_")) {
			logger.error(
				"You are using a Plunk public key (pk_) instead of a secret key (sk_). Email sending requires a secret key.",
			);
			throw new Error(
				"Invalid Plunk API key type: public keys cannot be used for sending emails",
			);
		}

		logger.info(
			`Attempting to send email to ${to} with subject: ${subject}`,
		);

		// Prepare the request payload
		const payload = {
			to,
			subject,
			body: html,
			text: text || undefined, // Only include if it has a value
		};

		// Only add the from email if it's configured
		if (process.env.PLUNK_FROM_EMAIL) {
			/* payload.from = process.env.PLUNK_FROM_EMAIL; */
			logger.info(
				`Using custom from email: ${process.env.PLUNK_FROM_EMAIL}`,
			);
		}

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

		// Handle unsuccessful responses
		if (!response.ok) {
			logger.error("Email sending failed", {
				status: response.status,
				statusText: response.statusText,

				to,
				subject,
			});

			// Check for common errors
			if (response.status === 401) {
				throw new Error(
					"Authentication failed: Invalid Plunk API key or insufficient permissions",
				);
			}
		}

		// Log success
		logger.info("Email sent successfully via Plunk", {
			to,
			subject,
		});

		return;
	} catch (error) {
		// Log detailed error information
		logger.error("Exception while sending email via Plunk", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			to,
			subject,
		});

		throw error;
	}
};
