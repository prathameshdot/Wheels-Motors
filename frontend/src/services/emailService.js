import emailjs from '@emailjs/browser';

// EmailJS Configuration
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_0zzn02b', // Your EmailJS service ID
  WELCOME_TEMPLATE_ID: 'welcome_template', // Your welcome email template ID
  OTP_TEMPLATE_ID: 'otp_template', // Your OTP email template ID
  PUBLIC_KEY: 'FDEcqY0cr84t9KDCE' // Your EmailJS public key
};

// Initialize EmailJS
emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);

export const sendWelcomeEmail = async (userEmail, userName, password, loginUrl) => {
  try {
    const templateParams = {
      to_email: userEmail,
      to_name: userName,
      login_email: userEmail,
      login_password: password,
      login_url: loginUrl || `${window.location.origin}/login`,
      admin_name: 'Super Admin',
      company_name: 'Admin Panel'
    };

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.WELCOME_TEMPLATE_ID,
      templateParams
    );

    console.log('Login credentials email sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending login credentials email:', error);
    return { success: false, error };
  }
};

export const sendPasswordResetOTP = async (userEmail, userName, otp) => {
  try {
    const templateParams = {
      to_email: userEmail,
      to_name: userName,
      otp_code: otp,
      admin_name: 'Super Admin'
    };

    // You'll need a separate template for OTP emails
    const response = await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.OTP_TEMPLATE_ID, // Using the OTP template
      templateParams
    );

    console.log('OTP email sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error };
  }
};

// Email templates you need to create in EmailJS:

/*
1. Welcome Email Template (template ID: welcome_template):
Subject: Welcome to Admin Panel - Login Credentials

Dear {{to_name}},

Welcome to the Admin Panel! Your account has been created successfully.

Login Details:
Email: {{login_email}}
Password: {{login_password}}
Login URL: {{login_url}}

Please keep these credentials safe and change your password after first login.

Best regards,
{{admin_name}}
{{company_name}}

2. OTP Email Template (template ID: otp_template):
Subject: Password Reset OTP

Dear {{to_name}},

Your OTP for password reset is: {{otp_code}}

This OTP is valid for 10 minutes only.

Best regards,
{{admin_name}}
*/

const emailService = {
  sendWelcomeEmail,
  sendPasswordResetOTP
};

export default emailService;
