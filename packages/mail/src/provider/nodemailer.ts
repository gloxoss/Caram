import { logger } from "@repo/logs";
import nodemailer from "nodemailer";
import type { SendEmailHandler } from "../../types";

export const sendWithNodemailer: SendEmailHandler = async ({ to, subject, html, text }) => {
  try {
    // Check if nodemailer configuration is available
    if (!process.env.MAIL_HOST) {
      throw new Error("MAIL_HOST is not defined in environment variables");
    }
    if (!process.env.MAIL_PORT) {
      throw new Error("MAIL_PORT is not defined in environment variables");
    }
    if (!process.env.MAIL_USER) {
      throw new Error("MAIL_USER is not defined in environment variables");
    }
    if (!process.env.MAIL_PASS) {
      throw new Error("MAIL_PASS is not defined in environment variables");
    }

    logger.info(`Setting up Nodemailer with host: ${process.env.MAIL_HOST}, port: ${process.env.MAIL_PORT}`);

    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT, 10),
      secure: parseInt(process.env.MAIL_PORT, 10) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // Verify connection configuration
    try {
      await transporter.verify();
      logger.info("Nodemailer connection verified successfully");
    } catch (verifyError) {
      logger.error("Failed to verify Nodemailer connection", {
        error: verifyError instanceof Error ? verifyError.message : String(verifyError),
      });
      throw new Error(`SMTP connection failed: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`);
    }

    // Send mail
    logger.info(`Sending email to ${to} with subject: ${subject} via Nodemailer`);
    const info = await transporter.sendMail({
      from: process.env.MAIL_USER,
      to,
      subject,
      text,
      html,
    });

    logger.info("Email sent successfully with Nodemailer", { 
      messageId: info.messageId, 
      to, 
      subject,
      response: info.response
    });
    
    return info;
  } catch (error) {
    logger.error("Failed to send email with Nodemailer", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      to,
      subject,
    });
    throw error;
  }
};