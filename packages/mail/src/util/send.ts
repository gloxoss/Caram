import { config } from "@repo/config";
import { logger } from "@repo/logs";
import type { mailTemplates } from "../../emails";
import { send } from "../provider";
import type { TemplateId } from "./templates";
import { getTemplate } from "./templates";

export async function sendEmail<T extends TemplateId>(
	params: {
		to: string;
		locale?: keyof typeof config.i18n.locales;
	} & (
		| {
				templateId: T;
				context: Omit<
					Parameters<(typeof mailTemplates)[T]>[0],
					"locale" | "translations"
				>;
		  }
		| {
				subject: string;
				text?: string;
				html?: string;
		  }
	),
) {
	const { to, locale = config.i18n.defaultLocale } = params;

	let html: string;
	let text: string;
	let subject: string;

	try {
		if ("templateId" in params) {
			const { templateId, context } = params;
			logger.info(`Preparing email template: ${templateId}`, { to });
			const template = await getTemplate({
				templateId,
				context,
				locale,
			});
			subject = template.subject;
			text = template.text;
			html = template.html;
		} else {
			subject = params.subject;
			text = params.text ?? "";
			html = params.html ?? "";
		}

		logger.info(`Sending email to ${to}`, { subject });
		
		await send({
			to,
			subject,
			text,
			html,
		});
		
		logger.info(`Successfully sent email to ${to}`, { subject });
		return true;
	} catch (e) {
		logger.error(`Failed to send email to ${to}`, { 
			error: e instanceof Error ? e.message : String(e),
			stack: e instanceof Error ? e.stack : undefined,
			params 
		});
		return false;
	}
}
