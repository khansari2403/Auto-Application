import { useState, useEffect } from 'react';

interface EmailConfig {
  provider: string;
  email: string;
  accessMethod: string;
  accessToken?: string;
  appPassword?: string;
  secretaryEnabled: boolean;
  secretaryEmail?: string;
  secretaryAccessMethod?: string;
}

const EMAIL_PROVIDERS = [
  { id: 'gmail', name: 'Gmail', icon: '📧', recommendation: 'OAuth recommended for security' },
  { id: 'outlook', name: 'Outlook / Microsoft 365', icon: '📬', recommendation: 'OAuth recommended, App Password also works' },
  { id: 'yahoo', name: 'Yahoo Mail', icon: '📩', recommendation: 'App Password required (OAuth limited)' },
  { id: 'icloud', name: 'iCloud Mail', icon: '🍎', recommendation: 'App-specific password required' },
  { id: 'custom', name: 'Custom IMAP/SMTP', icon: '⚙️', recommendation: 'Manual configuration' }
];

const ACCESS_METHODS = [
  { id: 'oauth', name: 'OAuth 2.0 (Recommended)', description: 'Most secure - no password stored', icon: '🔐' },
  { id: 'app_password', name: 'App-Specific Password', description: 'Create a password just for this app', icon: '🔑' },
  { id: 'delegate', name: 'Delegation Access', description: 'For Google Workspace / Microsoft 365', icon: '👥' },
  { id: 'invite_link', name: 'Invite Link (Limited)', description: 'Send invite to secretary', icon: '📨' }
];

export function EmailMonitoringSection({ userId }: { userId: number }) {
  const [config, setConfig] = useState<EmailConfig>({
    provider: '',
    email: '',
    accessMethod: '',
    secretaryEnabled: false
  });
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showManualCode, setShowManualCode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showSecretarySetup, setShowSecretarySetup] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [userId]);

  const loadConfig = async () => {
    const result = await (window as any).electron.getEmailConfig?.(userId);
    if (result?.success && result.data) {
      setGoogleClientId(result.data.google_client_id || '');
      setGoogleClientSecret(result.data.google_client_secret || '');
      setIsConnected(!!result.data.access_token);
      if (result.data.provider) {
        setConfig({
          ...config,
          provider: result.data.provider,
          email: result.data.email || '',
          accessMethod: result.data.access_method || ''
        });
      }
    }
  };

  const handleSave = async () => {
    await (window as any).electron.saveEmailConfig?.({ 
      userId, 
      googleClientId, 
      googleClientSecret,
      ...config 
    });
    alert('Email configuration saved!');
  };

  const handleConnect = async () => {
    if (config.accessMethod === 'oauth') {
      await (window as any).electron.getGmailAuthUrl?.(userId);
      setShowManualCode(true);
    } else if (config.accessMethod === 'app_password') {
      // Just save config for app password
      await handleSave();
      setIsConnected(true);
    }
  };

  const handleVerify = async (code: string) => {
    const result = await (window as any).electron.exchangeCode?.(userId, code);
    if (result?.success) {
      setIsConnected(true);
      setShowManualCode(false);
      alert('Connected successfully!');
    } else {
      alert('Error: ' + result?.error);
    }
  };

  const inputStyle = { width: '100%', padding: '12px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#333' };
  const cardStyle = { padding: '15px', border: '1px solid #eee', borderRadius: '8px', marginBottom: '15px', cursor: 'pointer', transition: 'all 0.2s' };

  return (
    <div style={{ padding: '20px', maxHeight: '85vh', overflowY: 'auto' }}>
      <h3>📧 Email Setup & Secretary Access</h3>
      
      {/* Connection Status */}
      <div style={{ 
        background: isConnected ? '#e8f5e9' : '#fff3e0', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: `1px solid ${isConnected ? '#a5d6a7' : '#ffcc80'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>{isConnected ? '✅' : '⚠️'}</span>
          <div>
            <strong>{isConnected ? 'Email Connected' : 'Email Not Connected'}</strong>
            <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#666' }}>
              {isConnected ? 'Your email is monitored for job application responses.' : 'Connect your email to track application responses and receive alerts.'}
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: Choose Provider */}
      <div style={{ marginBottom: '25px' }}>
        <h4>Step 1: Choose Email Provider</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {EMAIL_PROVIDERS.map(provider => (
            <div 
              key={provider.id}
              onClick={() => setConfig({...config, provider: provider.id})}
              style={{
                ...cardStyle,
                background: config.provider === provider.id ? '#e3f2fd' : '#fff',
                borderColor: config.provider === provider.id ? '#2196f3' : '#eee'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '5px' }}>{provider.icon}</div>
              <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>{provider.name}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>{provider.recommendation}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2: Access Method */}
      {config.provider && (
        <div style={{ marginBottom: '25px' }}>
          <h4>Step 2: Choose Access Method</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
            {ACCESS_METHODS.map(method => (
              <div 
                key={method.id}
                onClick={() => setConfig({...config, accessMethod: method.id})}
                style={{
                  ...cardStyle,
                  background: config.accessMethod === method.id ? '#e8f5e9' : '#fff',
                  borderColor: config.accessMethod === method.id ? '#4caf50' : '#eee'
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '5px' }}>{method.icon}</div>
                <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>{method.name}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{method.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Configuration */}
      {config.accessMethod && (
        <div style={{ marginBottom: '25px' }}>
          <h4>Step 3: Configure Access</h4>
          
          <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
            <label style={labelStyle}>Your Email Address</label>
            <input 
              style={inputStyle} 
              type="email"
              value={config.email} 
              onChange={e => setConfig({...config, email: e.target.value})}
              placeholder="your.email@example.com"
            />

            {config.accessMethod === 'oauth' && (
              <>
                <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
                  <p style={{ margin: 0, fontSize: '12px' }}>
                    <strong>ℹ️ OAuth Setup:</strong> For Gmail, you need to create OAuth credentials in Google Cloud Console.
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ marginLeft: '5px' }}>Create Credentials →</a>
                  </p>
                </div>
                <label style={labelStyle}>Client ID</label>
                <input style={inputStyle} value={googleClientId} onChange={e => setGoogleClientId(e.target.value)} placeholder="Your OAuth Client ID" />
                <label style={labelStyle}>Client Secret</label>
                <input style={inputStyle} type="password" value={googleClientSecret} onChange={e => setGoogleClientSecret(e.target.value)} placeholder="Your OAuth Client Secret" />
              </>
            )}

            {config.accessMethod === 'app_password' && (
              <>
                <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
                  <p style={{ margin: 0, fontSize: '12px' }}>
                    <strong>ℹ️ App Password:</strong> Generate an app-specific password in your email provider's security settings.
                    {config.provider === 'gmail' && <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ marginLeft: '5px' }}>Gmail App Passwords →</a>}
                    {config.provider === 'outlook' && <a href="https://account.live.com/proofs/AppPassword" target="_blank" rel="noreferrer" style={{ marginLeft: '5px' }}>Outlook App Passwords →</a>}
                  </p>
                </div>
                <label style={labelStyle}>App Password</label>
                <input 
                  style={inputStyle} 
                  type="password"
                  value={config.appPassword || ''} 
                  onChange={e => setConfig({...config, appPassword: e.target.value})}
                  placeholder="Enter app-specific password"
                />
              </>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={handleSave} style={{ padding: '12px 25px', background: '#666', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                💾 Save Configuration
              </button>
              <button onClick={handleConnect} style={{ padding: '12px 25px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                🔗 Connect Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Code Entry */}
      {showManualCode && (
        <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '8px', marginBottom: '25px', border: '1px dashed #ff9800' }}>
          <h4 style={{ marginTop: 0, color: '#ef6c00' }}>📋 Manual Code Entry</h4>
          <p style={{ fontSize: '13px', color: '#666' }}>If the OAuth popup didn't close automatically, paste the authorization code here:</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              style={{...inputStyle, marginBottom: 0, flex: 1}} 
              value={manualCode} 
              onChange={e => setManualCode(e.target.value)}
              placeholder="Paste authorization code..."
            />
            <button onClick={() => handleVerify(manualCode)} style={{ padding: '12px 20px', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Verify
            </button>
          </div>
        </div>
      )}

      {/* Secretary Access Section */}
      <div style={{ borderTop: '2px solid #eee', paddingTop: '25px', marginTop: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h4 style={{ margin: 0 }}>👥 Secretary Email Access</h4>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={config.secretaryEnabled} 
              onChange={e => setConfig({...config, secretaryEnabled: e.target.checked})}
            />
            Enable Secretary Access
          </label>
        </div>

        {config.secretaryEnabled && (
          <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
            <p style={{ fontSize: '13px', color: '#666', marginTop: 0 }}>
              Allow a secretary or assistant to monitor your email for job application responses without giving them full access to your account.
            </p>

            <label style={labelStyle}>Secretary's Email Address</label>
            <input 
              style={inputStyle}
              type="email"
              value={config.secretaryEmail || ''}
              onChange={e => setConfig({...config, secretaryEmail: e.target.value})}
              placeholder="secretary@example.com"
            />

            <label style={labelStyle}>Secretary Access Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '15px' }}>
              {[
                { id: 'separate_login', name: 'Separate Login', desc: 'Secretary creates their own account', recommended: true },
                { id: 'delegate_gmail', name: 'Gmail Delegation', desc: 'For Google Workspace users' },
                { id: 'delegate_outlook', name: 'Outlook Delegation', desc: 'For Microsoft 365 users' },
                { id: 'invite_limited', name: 'Limited Invite Link', desc: 'Read-only access via link' }
              ].map(method => (
                <div 
                  key={method.id}
                  onClick={() => setConfig({...config, secretaryAccessMethod: method.id})}
                  style={{
                    padding: '12px',
                    border: `2px solid ${config.secretaryAccessMethod === method.id ? '#2196f3' : '#ddd'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: config.secretaryAccessMethod === method.id ? '#e3f2fd' : '#fff'
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                    {method.name}
                    {method.recommended && <span style={{ marginLeft: '5px', fontSize: '10px', background: '#4caf50', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>Recommended</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>{method.desc}</div>
                </div>
              ))}
            </div>

            {config.secretaryAccessMethod === 'separate_login' && (
              <div style={{ background: '#e8f5e9', padding: '12px', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontSize: '12px' }}>
                  <strong>✅ Separate Login (Recommended):</strong> The secretary will create their own account and you'll grant them permission to view your job application emails only.
                </p>
              </div>
            )}

            {config.secretaryAccessMethod === 'delegate_gmail' && (
              <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontSize: '12px' }}>
                  <strong>Gmail Delegation:</strong> Go to Gmail Settings → Accounts → Grant access → Add the secretary's email.
                  <a href="https://support.google.com/mail/answer/138350" target="_blank" rel="noreferrer" style={{ marginLeft: '5px' }}>Learn more →</a>
                </p>
              </div>
            )}

            {config.secretaryAccessMethod === 'delegate_outlook' && (
              <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontSize: '12px' }}>
                  <strong>Outlook Delegation:</strong> Go to Outlook → File → Account Settings → Delegate Access → Add.
                  <a href="https://support.microsoft.com/en-us/office/allow-someone-else-to-manage-your-mail-and-calendar" target="_blank" rel="noreferrer" style={{ marginLeft: '5px' }}>Learn more →</a>
                </p>
              </div>
            )}

            <button onClick={handleSave} style={{ marginTop: '15px', padding: '12px 25px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              💾 Save Secretary Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailMonitoringSection;
