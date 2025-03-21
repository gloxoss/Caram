# Email Configuration Guide

This guide will help you set up and troubleshoot email sending in your application.

## Quick Start

1. Copy `.env.local.example` to `.env.local` in your project root
2. Fill in your email provider credentials
3. Run the test script to verify your configuration:

```bash
node packages/mail/test-email.js
```

## Fixing Common Email Issues

### 1. Plunk Issues

The error `Verify your domain before using a custom from address` occurs when:
- You're using a custom email address in the "from" field
- The domain hasn't been verified in your Plunk account

**Solutions:**

1. **Verify your domain** in the Plunk dashboard (recommended)
   - Go to [Plunk Dashboard](https://app.useplunk.com/domains)
   - Add and verify your domain

2. **Use the default Plunk email address** (temporary solution)
   - Set `MAIL_FROM=hello@useplunk.com` in your `.env.local` file

3. **Check your API key**
   - Ensure your Plunk API key is correct
   - Get your API key from [Plunk Settings](https://app.useplunk.com/settings)

### 2. Gmail/Nodemailer Issues

The error `Invalid login: Username and Password not accepted` occurs when:
- You're using your regular Gmail password instead of an App Password
- Your credentials are incorrect

**Solutions:**

1. **Use an App Password** (required for Gmail)
   - Enable 2-Step Verification in your Google account
   - Generate an App Password at [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Use this App Password in your `MAIL_PASS` environment variable

2. **Check your email settings**
   - Verify `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, and `MAIL_PASS` are correct
   - For Gmail: Use `smtp.gmail.com` and port `587`

## Testing Your Configuration

The test script supports testing both email providers:

```bash
# Test both providers
node packages/mail/test-email.js

# Test only Nodemailer
node packages/mail/test-email.js nodemailer

# Test only Plunk
node packages/mail/test-email.js plunk

# Test with a specific recipient email
node packages/mail/test-email.js both test@example.com
```

## Email Provider Priority

You can set the order in which email providers are tried by configuring the `EMAIL_PROVIDERS` environment variable:

```
EMAIL_PROVIDERS=plunk,nodemailer
```

This will try Plunk first, then fall back to Nodemailer if Plunk fails.