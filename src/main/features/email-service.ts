import nodemailer from 'nodemailer';
import { getAllQuery, logAction, runQuery } from '../database';

interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  email_user: string;
  email_password: string;
  from_name?: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Create SMTP transporter from config
 */
function createTransporter(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: config.smtp_secure, // true for 465, false for other ports
    auth: {
      user: config.email_user,
      pass: config.email_password,
    },
    tls: {
      rejectUnauthorized: false // Allow self-signed certs
    }
  });
}

/**
 * Get email configuration from database
 */
export async function getEmailConfig(): Promise<EmailConfig | null> {
  const configs = await getAllQuery('SELECT * FROM email_config');
  const config = configs[0];
  
  if (!config || !config.email_user || !config.email_password) {
    return null;
  }
  
  return {
    smtp_host: config.smtp_host || 'smtp.gmail.com',
    smtp_port: config.smtp_port || 587,
    smtp_secure: config.smtp_secure || false,
    email_user: config.email_user,
    email_password: config.email_password,
    from_name: config.from_name || 'Job Application Bot'
  };
}

/**
 * Send email using SMTP
 */
export async function sendEmail(options: SendEmailOptions, userId?: number): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const config = await getEmailConfig();
    
    if (!config) {
      return { success: false, error: 'Email configuration not found. Please configure SMTP settings.' };
    }
    
    const transporter = createTransporter(config);
    
    // Verify connection
    await transporter.verify();
    
    const mailOptions = {
      from: `"${config.from_name}" <${config.email_user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    if (userId) {
      await logAction(userId, 'email_service', `✉️ Email sent to ${options.to}: ${options.subject}`, 'completed', true);
    }
    
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error: any) {
    console.error('Email send error:', error);
    
    if (userId) {
      await logAction(userId, 'email_service', `❌ Failed to send email: ${error.message}`, 'failed', false);
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Send notification email to user's personal email
 */
export async function sendNotification(userId: number, type: 'response' | 'follow_up' | 'verification', details: any): Promise<boolean> {
  try {
    // Get secretary settings
    const settings = await getAllQuery('SELECT * FROM settings');
    const userSettings = settings[0];
    
    if (!userSettings?.secretary_settings) {
      console.log('Secretary settings not configured');
      return false;
    }
    
    const secretarySettings = typeof userSettings.secretary_settings === 'string' 
      ? JSON.parse(userSettings.secretary_settings) 
      : userSettings.secretary_settings;
    
    // Check if notifications are enabled
    if (!secretarySettings.enabled) return false;
    
    const notifyEmail = secretarySettings.notifyUserEmail;
    if (!notifyEmail) return false;
    
    // Check specific notification type
    if (type === 'response' && !secretarySettings.notifyOnResponse) return false;
    if (type === 'follow_up' && !secretarySettings.notifyOnFollowUp) return false;
    if (type === 'verification' && !secretarySettings.notifyOnVerification) return false;
    
    // Build email content based on type
    let subject = '';
    let html = '';
    
    switch (type) {
      case 'response':
        subject = `📬 Company Response: ${details.company || 'Unknown'}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">New Response Received</h2>
            <p>You've received a response from <strong>${details.company}</strong> regarding your application for <strong>${details.position}</strong>.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Subject:</strong> ${details.subject}</p>
              <p style="margin: 10px 0 0;"><strong>Preview:</strong> ${details.snippet}</p>
            </div>
            <p>Log in to your Job Application tool to view the full message.</p>
          </div>
        `;
        break;
        
      case 'follow_up':
        subject = `📤 Follow-up Sent: ${details.company || 'Unknown'}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2196F3;">Follow-up Email Sent</h2>
            <p>A follow-up email has been automatically sent to <strong>${details.company}</strong> for the <strong>${details.position}</strong> position.</p>
            <p style="color: #666;">This follow-up was sent ${details.daysAfter || 2} days after your initial application.</p>
          </div>
        `;
        break;
        
      case 'verification':
        subject = `⚠️ Action Required: Verification Needed`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF9800;">Verification Required</h2>
            <p>Your application to <strong>${details.company}</strong> requires manual verification.</p>
            <p><strong>Reason:</strong> ${details.reason || 'CAPTCHA or security check detected'}</p>
            <p>Please log in to complete the application manually.</p>
          </div>
        `;
        break;
    }
    
    const result = await sendEmail({ to: notifyEmail, subject, html }, userId);
    return result.success;
    
  } catch (error) {
    console.error('Notification error:', error);
    return false;
  }
}

/**
 * Send follow-up email for application
 */
export async function sendFollowUpEmail(userId: number, application: any): Promise<boolean> {
  try {
    const config = await getEmailConfig();
    if (!config) return false;
    
    // Get user profile for signature
    const profiles = await getAllQuery('SELECT * FROM user_profile');
    const profile = profiles[0];
    
    const userName = profile?.name || 'Applicant';
    const userTitle = profile?.title || 'Professional';
    
    const subject = `Following Up: ${application.position} Application - ${userName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <p>Dear Hiring Team,</p>
        
        <p>I hope this message finds you well. I wanted to follow up on my application for the <strong>${application.position}</strong> position that I submitted on ${new Date(application.applied_date).toLocaleDateString()}.</p>
        
        <p>I remain very enthusiastic about the opportunity to contribute to ${application.company} and would welcome the chance to discuss how my skills and experience align with your team's needs.</p>
        
        <p>Please let me know if there's any additional information I can provide. I look forward to hearing from you.</p>
        
        <p>Best regards,<br/>
        <strong>${userName}</strong><br/>
        ${userTitle}</p>
      </div>
    `;
    
    // This would need the company's email - for now just log the action
    await logAction(userId, 'email_service', `📤 Follow-up prepared for ${application.company} - ${application.position}`, 'completed', true);
    
    // In a real implementation, you'd need the company's HR email
    // const result = await sendEmail({ to: application.company_email, subject, html }, userId);
    // return result.success;
    
    return true;
  } catch (error) {
    console.error('Follow-up email error:', error);
    return false;
  }
}

/**
 * Send thank you confirmation email
 */
export async function sendThanksConfirmation(userId: number, company: string, position: string, recipientEmail?: string): Promise<boolean> {
  try {
    if (!recipientEmail) {
      await logAction(userId, 'email_service', `📝 Thanks confirmation prepared for ${company} (no email available)`, 'completed', true);
      return true;
    }
    
    const profiles = await getAllQuery('SELECT * FROM user_profile');
    const profile = profiles[0];
    const userName = profile?.name || 'Applicant';
    
    const subject = `Thank You - ${position} Application Confirmation`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <p>Dear Hiring Team,</p>
        
        <p>Thank you for confirming receipt of my application for the <strong>${position}</strong> position at ${company}.</p>
        
        <p>I appreciate you taking the time to review my application and look forward to the opportunity to discuss my qualifications further.</p>
        
        <p>Best regards,<br/>
        <strong>${userName}</strong></p>
      </div>
    `;
    
    const result = await sendEmail({ to: recipientEmail, subject, html }, userId);
    return result.success;
    
  } catch (error) {
    console.error('Thanks confirmation error:', error);
    return false;
  }
}

/**
 * Test email configuration
 */
export async function testEmailConfig(userId: number, testEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getEmailConfig();
    
    if (!config) {
      return { success: false, error: 'Email configuration not found' };
    }
    
    const result = await sendEmail({
      to: testEmail,
      subject: '✅ Job Application Tool - Email Test Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4CAF50;">Email Configuration Test</h2>
          <p>Congratulations! Your email settings are configured correctly.</p>
          <p>You will now receive notifications about:</p>
          <ul>
            <li>Company responses to your applications</li>
            <li>Follow-up emails sent automatically</li>
            <li>Verification requests requiring your attention</li>
          </ul>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This is an automated test email from your Job Application Automation tool.
          </p>
        </div>
      `
    }, userId);
    
    return result;
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
