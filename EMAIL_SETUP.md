# Email Service Setup Guide

## EmailJS Configuration

To enable email notifications for user creation and OTP verification, you need to configure EmailJS:

### 1. Create EmailJS Account
1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up for a free account
3. Create a new service (Gmail, Outlook, etc.)

### 2. Create Email Templates

#### Welcome Email Template
- Template ID: `welcome_template`
- Subject: `Welcome to Admin Panel - Your Account Details`
- Content:
```
Hello {{name}},

Welcome to the Admin Panel! Your account has been created successfully.

Login Details:
Email: {{email}}
Password: {{password}}
Login URL: {{loginUrl}}

Please keep these credentials safe and change your password after first login.

Best regards,
Admin Team
```

#### OTP Email Template
- Template ID: `otp_template`  
- Subject: `Your Verification Code`
- Content:
```
Hello,

Your verification code is: {{otp}}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Admin Team
```

### 3. Configure Service

Update the `frontend/src/services/emailService.js` file with your EmailJS credentials:

```javascript
const SERVICE_ID = 'your_service_id_here';
const PUBLIC_KEY = 'your_public_key_here';
const WELCOME_TEMPLATE_ID = 'welcome_template';
const OTP_TEMPLATE_ID = 'otp_template';
```

### 4. Get Your Credentials

1. **Service ID**: Found in EmailJS dashboard under "Email Services"
2. **Public Key**: Found in EmailJS dashboard under "Account" > "API Keys"
3. **Template IDs**: Found in EmailJS dashboard under "Email Templates"

### 5. Test the Setup

1. Start your React app: `npm start`
2. Go to Users page
3. Create a new user
4. Check if the welcome email is sent

### 6. Production Considerations

- **Security**: Never expose your private key in frontend code
- **Rate Limiting**: EmailJS has monthly limits on free accounts
- **Templates**: Customize email templates to match your branding
- **Error Handling**: The app will continue to work even if email sending fails

### Troubleshooting

- **CORS Issues**: Make sure your domain is added to EmailJS allowed origins
- **Template Variables**: Ensure template variable names match the ones used in code
- **Spam Folder**: Check spam folder if emails aren't received
- **Console Logs**: Check browser console for detailed error messages

### Alternative Email Services

If you prefer other email services, you can replace EmailJS with:
- SendGrid
- AWS SES
- Nodemailer (requires backend)
- Resend
- Postmark

Just update the `emailService.js` file accordingly.
