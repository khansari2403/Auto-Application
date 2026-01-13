/**
 * Email Configuration Section
 * Handles email provider setup (Gmail OAuth, Outlook, SMTP)
 */

import { useState, useEffect } from 'react';
import '../../styles/settings.css';

interface EmailConfigSectionProps {
  userId: number;
}

function EmailConfigSection({ userId }: EmailConfigSectionProps) {
  const [emailProvider, setEmailProvider] = useState('gmail');
  const [emailAddress, setEmailAddress] = useState('');
  const [authType, setAuthType] = useState('oauth');
  const [autoSend, setAutoSend] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    loadEmailConfig();
  }, [userId]);

  const loadEmailConfig = async () => {
    try {
      const result = await window.electron.getEmailConfig(userId);
      if (result.success && result.data) {
        setEmailProvider(result.data.email_provider || 'gmail');
        // Check both naming styles just in case
        setEmailAddress(result.data.email_address || result.data.emailAddress || '');
        setAuthType(result.data.auth_type || 'oauth');
        setAutoSend(result.data.auto_send || false);
      }
    } catch (error) {
      console.error('Failed to load email config:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailAddress) {
      setMessage('Please enter your email address');
      setMessageType('error');
      return;
    }

    if (authType === 'smtp' && (!smtpHost || !smtpUsername || !smtpPassword)) {
      setMessage('Please fill in all SMTP details');
      setMessageType('error');
      return;
    }

    setIsLoading(true);

    try {
      const result = await window.electron.saveEmailConfig({
        userId,
        emailProvider,
        emailAddress,
        authType,
        smtpHost,
        smtpPort: parseInt(smtpPort),
        smtpUsername,
        smtpPassword,
        autoSend,
      });

      if (result.success) {
        setMessage('Email configuration saved successfully!');
        setMessageType('success');

        await window.electron.addActionLog({
          userId,
          actionType: 'email_config_saved',
          actionDescription: `Email configured: ${emailAddress}`,
          status: 'completed',
          success: true,
        });
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>📧 Email Configuration</h3>
        <p>Set up email for sending applications and receiving verification emails</p>
      </div>

      {message && (
        <div className={`message message-${messageType}`}>
          {messageType === 'success' && '✓ '}
          {messageType === 'error' && '✗ '}
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="settings-form">
        <div className="form-group">
          <label htmlFor="email-provider">Email Provider *</label>
          <select
            id="email-provider"
            value={emailProvider}
            onChange={(e) => setEmailProvider(e.target.value)}
            className="form-input"
            disabled={isLoading}
          >
            <option value="gmail">Gmail</option>
            <option value="outlook">Outlook</option>
            <option value="custom">Custom SMTP</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="email-address">Email Address *</label>
          <input
            id="email-address"
            type="email"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            placeholder="your.email@gmail.com"
            className="form-input"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="auth-type">Authentication Type *</label>
          <select
            id="auth-type"
            value={authType}
            onChange={(e) => setAuthType(e.target.value)}
            className="form-input"
            disabled={isLoading}
          >
            <option value="oauth">OAuth (Recommended)</option>
            <option value="smtp">SMTP</option>
          </select>
        </div>

        {authType === 'smtp' && (
          <>
            <div className="form-group">
              <label htmlFor="smtp-host">SMTP Host *</label>
              <input
                id="smtp-host"
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="form-input"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="smtp-port">SMTP Port *</label>
              <input
                id="smtp-port"
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
                className="form-input"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="smtp-username">SMTP Username *</label>
              <input
                id="smtp-username"
                type="text"
                value={smtpUsername}
                onChange={(e) => setSmtpUsername(e.target.value)}
                placeholder="your.email@gmail.com"
                className="form-input"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="smtp-password">SMTP Password *</label>
              <input
                id="smtp-password"
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="Your app password"
                className="form-input"
                disabled={isLoading}
              />
              <small>For Gmail, use an App Password, not your regular password</small>
            </div>
          </>
        )}

        <div className="form-group checkbox">
          <input
            id="auto-send"
            type="checkbox"
            checked={autoSend}
            onChange={(e) => setAutoSend(e.target.checked)}
            disabled={isLoading}
          />
          <label htmlFor="auto-send">
            Auto-send emails (if unchecked, emails will be saved as drafts for manual review)
          </label>
        </div>

        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Email Configuration'}
        </button>
      </form>

      <div className="section-info">
        <h4>Email Configuration Options:</h4>
        <ul>
          <li><strong>OAuth:</strong> Secure, recommended. App will request permission to send emails</li>
          <li><strong>SMTP:</strong> Manual setup. Requires SMTP credentials from your email provider</li>
          <li><strong>Auto-send:</strong> If enabled, emails are sent automatically. If disabled, you review before sending</li>
        </ul>
      </div>
    </div>
  );
}

export default EmailConfigSection;
