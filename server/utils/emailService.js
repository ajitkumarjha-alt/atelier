/**
 * Email Service for OTP and Notifications
 * Supports Nodemailer with Gmail or other SMTP providers
 */

import nodemailer from 'nodemailer';
import logger from './logger.js';

// Create reusable transporter
let transporter = null;

/**
 * Initialize email transporter
 * Uses environment variables for configuration
 */
function getTransporter() {
  if (transporter) return transporter;

  const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
    }
  };

  // Gmail-specific configuration
  if (emailConfig.host === 'smtp.gmail.com') {
    emailConfig.service = 'gmail';
  }

  transporter = nodemailer.createTransport(emailConfig);

  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      logger.error('Email configuration error:', error);
    } else {
      logger.info('Email service is ready');
    }
  });

  return transporter;
}

/**
 * Send OTP email to vendor/consultant
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} userType - 'vendor' or 'consultant'
 * @returns {Promise<boolean>} Success status
 */
export async function sendOTPEmail(email, otp, userType = 'vendor') {
  try {
    const transport = getTransporter();

    const mailOptions = {
      from: {
        name: 'Atelier by Lodha Group',
        address: process.env.SMTP_USER || process.env.EMAIL_USER
      },
      to: email,
      subject: `Your Atelier ${userType.charAt(0).toUpperCase() + userType.slice(1)} Login OTP`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atelier OTP Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f5f5f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #d4af37; margin: 0; font-size: 28px; font-weight: bold;">Atelier</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">by Lodha Group</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 24px;">Your Login Verification Code</h2>
              
              <p style="color: #4a4a4a; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
                Hello,<br><br>
                You are receiving this email because a login attempt was made for your ${userType} account. 
                Use the following One-Time Password (OTP) to complete your login:
              </p>

              <!-- OTP Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 30px 0;">
                    <div style="background-color: #f8f8f5; border: 2px dashed #d4af37; border-radius: 8px; padding: 25px; display: inline-block;">
                      <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a; font-family: 'Courier New', monospace;">
                        ${otp}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="color: #4a4a4a; margin: 30px 0 20px 0; font-size: 14px; line-height: 1.6;">
                <strong style="color: #d4af37;">⏰ Important:</strong> This OTP is valid for <strong>10 minutes</strong> only.
              </p>

              <p style="color: #666666; margin: 0 0 10px 0; font-size: 13px; line-height: 1.6;">
                If you didn't request this code, please ignore this email or contact support if you have concerns about your account security.
              </p>

              <!-- Security Notice -->
              <div style="background-color: #fff9e6; border-left: 4px solid #d4af37; padding: 15px; margin: 30px 0;">
                <p style="color: #856404; margin: 0; font-size: 13px; line-height: 1.5;">
                  <strong>🔒 Security Tip:</strong> Never share your OTP with anyone. Atelier staff will never ask for your OTP.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f5; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e0;">
              <p style="color: #666666; margin: 0 0 10px 0; font-size: 13px;">
                Need help?
                <a href="mailto:support@atelier.com" style="color: #d4af37; text-decoration: none;">Contact Support</a>
              </p>
              <p style="color: #999999; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} Atelier by Lodha Group. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `
Atelier ${userType.charAt(0).toUpperCase() + userType.slice(1)} Login Verification

Your OTP code is: ${otp}

This code is valid for 10 minutes.

If you didn't request this code, please ignore this email.

For support, contact: support@atelier.com

© ${new Date().getFullYear()} Atelier by Lodha Group. All rights reserved.
      `
    };

    const info = await transport.sendMail(mailOptions);
    logger.info(`OTP email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error('Error sending OTP email:', error);
    return false;
  }
}

/**
 * Send welcome email to new vendor/consultant
 * @param {string} email - Recipient email address
 * @param {string} name - User's name
 * @param {string} userType - 'vendor' or 'consultant'
 * @returns {Promise<boolean>} Success status
 */
export async function sendWelcomeEmail(email, name, userType = 'vendor') {
  try {
    const transport = getTransporter();

    const mailOptions = {
      from: {
        name: 'Atelier by Lodha Group',
        address: process.env.SMTP_USER || process.env.EMAIL_USER
      },
      to: email,
      subject: `Welcome to Atelier - ${userType.charAt(0).toUpperCase() + userType.slice(1)} Portal`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f5f5f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #d4af37; margin: 0; font-size: 28px;">Welcome to Atelier</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0;">Construction Project Management Platform</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #1a1a1a; font-size: 18px; margin: 0 0 20px 0;">Hello ${name},</p>
              
              <p style="color: #4a4a4a; margin: 0 0 20px 0; line-height: 1.6;">
                Welcome to Atelier! Your ${userType} account has been successfully created.
              </p>

              <p style="color: #4a4a4a; margin: 0 0 30px 0; line-height: 1.6;">
                You can now access the portal to manage your projects, submit materials, respond to RFIs, and collaborate with the Lodha team.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.APP_URL || 'http://localhost:5174'}/${userType}-login" 
                   style="background-color: #d4af37; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Login to Atelier
                </a>
              </div>

              <p style="color: #666666; margin: 30px 0 0 0; font-size: 14px; line-height: 1.6;">
                If you have any questions, please don't hesitate to contact our support team.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f8f8f5; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="color: #666666; margin: 0 0 10px 0; font-size: 13px;">
                Need help?
                <a href="mailto:support@atelier.com" style="color: #d4af37; text-decoration: none;">Contact Support</a>
              </p>
              <p style="color: #999999; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} Atelier by Lodha Group
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `Welcome to Atelier, ${name}!\n\nYour ${userType} account has been created successfully.\n\nLogin at: ${process.env.APP_URL || 'http://localhost:5174'}/${userType}-login\n\nFor support: support@atelier.com`
    };

    const info = await transport.sendMail(mailOptions);
    logger.info(`Welcome email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error('Error sending welcome email:', error);
    return false;
  }
}

export default {
  sendOTPEmail,
  sendWelcomeEmail
};
