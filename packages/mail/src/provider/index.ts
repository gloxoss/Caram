import { logger } from "@repo/logs";
import type { SendEmailHandler } from "../../types";
import { sendWithNodemailer } from "./nodemailer";
import { send as sendWithPlunk } from "./plunk";

// Export the main send function that will try multiple providers
export const send: SendEmailHandler = async (params) => {
	try {
		// First try with Plunk if it has a secret key
		// biome-ignore lint/complexity/useOptionalChain: <explanation>
		if (
			// biome-ignore lint/complexity/useOptionalChain: <explanation>
			process.env.PLUNK_API_KEY &&
			process.env.PLUNK_API_KEY.startsWith("sk_")
		) {
			try {
				logger.info("Attempting to send email using Plunk provider");
				return await sendWithPlunk(params);
			} catch (error) {
				logger.warn(
					"Failed to send email with Plunk, trying fallback provider",
					{
						error:
							error instanceof Error
								? error.message
								: String(error),
					},
				);
			}
		} else if (process.env.PLUNK_API_KEY) {
			logger.warn(
				"Plunk API key is not a secret key (should start with sk_), trying fallback provider",
			);
		}

		// Then try with Nodemailer if Plunk fails or is not configured
		if (
			process.env.MAIL_HOST &&
			process.env.MAIL_USER &&
			process.env.MAIL_PASS
		) {
			logger.info("Attempting to send email using Nodemailer provider");
			return await sendWithNodemailer(params);
		}

		// If no provider is configured properly
		throw new Error(
			"No email provider is properly configured. Please check your environment variables. You need either a valid Plunk secret key or Nodemailer configuration.",
		);
	} catch (error) {
		logger.error("All email providers failed", {
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
};
