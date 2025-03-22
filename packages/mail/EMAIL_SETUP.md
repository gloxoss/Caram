# Email Setup Guide

This guide will help you set up and test email functionality in your Supastarter application.

## Configuration Options

You have two options for sending emails:

1. **Plunk** - A simple email API service
2. **Nodemailer** - For sending emails via SMTP (e.g., Gmail, Outlook, etc.)

## Setting Up Plunk

1. Sign up for an account at [Plunk](https://useplunk.com/)
2. Get your API key from the Plunk dashboard
3. Update your `.env.local` file:

```
PLUNK_API_KEY=sk_your_secret_key_here  # Must start with sk_, not pk_
PLUNK_FROM_EMAIL=your-verified@email.com  # Must be verified in Plunk
```

## Setting Up Nodemailer with Gmail

1. Enable 2-Step Verification in your Google account
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification

2. Create an App Password
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" as the app and "Other" as the device (name it "Supastarter")
   - Copy the 16-character password that Google generates

3. Update your `.env.local` file:

```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-gmail@gmail.com
MAIL_PASS=your-16-character-app-password
```

## Testing Your Email Configuration

### Testing Nodemailer

Run the following command:

```
node packages/mail/test-email.js
```

### Testing Plunk

Run the following command:

```
node packages/mail/test-plunk.js
```

## Troubleshooting

### Common Nodemailer Issues

1. **Authentication Error (EAUTH)**
   - Make sure you're using an App Password, not your regular password
   - Verify that your email and password are correct in `.env.local`

2. **Connection Error (ESOCKET or ECONNECTION)**
   - Check if your MAIL_HOST and MAIL_PORT are correct
   - Ensure your network allows connections to the mail server

### Common Plunk Issues

1. **Using a Public Key**
   - Plunk requires a secret key (starts with `sk_`) for sending emails
   - Public keys (start with `pk_`) can only be used for client-side tracking

2. **From Email Not Verified**
   - The email address you're sending from must be verified in your Plunk account

## Email Templates

The application uses email templates for different purposes:
- Password reset
- Email verification
- Magic link login
- Organization invitations

These templates are located in the `packages/mail/src/templates` directory.

## Need More Help?

If you're still having issues, check the [Plunk documentation](https://docs.useplunk.com/) or [Nodemailer documentation](https://nodemailer.com/) for more detailed information.