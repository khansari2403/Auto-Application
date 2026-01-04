import { useState, useEffect } from 'react';
import { SecretaryControlPanel } from './SecretaryControlPanel';

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
  const [activeTab, setActiveTab] = useState<'email' | 'secretary'>('email');
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
    const result = await (window as any).electron.invoke?.('settings:get', userId);
    if (result?.success && result.data) {
      setGoogleClientId(result.data.google_client_id || '');
      setGoogleClientSecret(result.data.google_client_secret || '');
      setIsConnected(!!result.data.email_connected);
      if (result.data.email_provider) {
        setConfig({
          ...config,
          provider: result.data.email_provider,
          email: result.data.email || '',
          accessMethod: result.data.email_access_method || ''
        });
      }
    }
  };

  const handleSave = async () => {
    await (window as any).electron.invoke?.('settings:update', { 
      id: 1,
      google_client_id: googleClientId, 
      google_client_secret: googleClientSecret,
      email_provider: config.provider,
      email: config.email,
      email_access_method: config.accessMethod,
      email_app_password: config.appPassword
    });
    alert('Email configuration saved!');
  };

  const handleConnect = async () => {
    if (config.accessMethod === 'oauth') {
      // TODO: Implement OAuth flow
      setShowManualCode(true);
    } else if (config.accessMethod === 'app_password') {
      // Save config with connected status
      await (window as any).electron.invoke?.('settings:update', { 
        id: 1,
        google_client_id: googleClientId, 
        google_client_secret: googleClientSecret,
        email_provider: config.provider,
        email: config.email,
        email_access_method: config.accessMethod,
        email_app_password: config.appPassword,
        email_connected: true  // Persist connection status
      });
      setIsConnected(true);
      alert('Email connected successfully!');
    }
  };

  const handleVerify = async (code: string) => {
    // Save OAuth verification with connected status
    await (window as any).electron.invoke?.('settings:update', { 
      id: 1,
      google_client_id: googleClientId, 
      google_client_secret: googleClientSecret,
      email_provider: config.provider,
      email: config.email,
      email_access_method: config.accessMethod,
      oauth_code: code,
      email_connected: true  // Persist connection status
    });
    setIsConnected(true);
    setShowManualCode(false);
    alert('Connected successfully!');
  };

  const inputStyle = { width: '100%', padding: '12px', marginBottom: '10px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px', background: 'var(--input-bg)', color: 'var(--text-primary)' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' };
  const cardStyle = { padding: '15px', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '15px', cursor: 'pointer', transition: 'all 0.2s', background: 'var(--card-bg)' };

  return (
    <div style={{ maxHeight: '85vh', overflowY: 'auto' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: '0' }}>
        <button 
          onClick={() => setActiveTab('email')}
          style={{ 
            flex: 1, padding: '15px', border: 'none', cursor: 'pointer',
            background: activeTab === 'email' ? 'var(--primary)' : 'var(--bg-secondary)',
            color: activeTab === 'email' ? '#fff' : 'var(--text-primary)',
            fontWeight: activeTab === 'email' ? 'bold' : 'normal',
            borderRadius: '8px 8px 0 0',
            fontSize: '14px'
          }}
        >
          📧 Email Connection
        </button>
        <button 
          onClick={() => setActiveTab('secretary')}
          style={{ 
            flex: 1, padding: '15px', border: 'none', cursor: 'pointer',
            background: activeTab === 'secretary' ? 'var(--primary)' : 'var(--bg-secondary)',
            color: activeTab === 'secretary' ? '#fff' : 'var(--text-primary)',
            fontWeight: activeTab === 'secretary' ? 'bold' : 'normal',
            borderRadius: '8px 8px 0 0',
            fontSize: '14px'
          }}
        >
          🤖 Secretary Settings
        </button>
      </div>

      {/* Secretary Tab */}
      {activeTab === 'secretary' && (
        <SecretaryControlPanel userId={userId} />
      )}

      {/* Email Tab */}
      {activeTab === 'email' && (
        <div style={{ padding: '20px' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>📧 Email Setup & Connection</h3>
      
          {/* Connection Status */}
          <div style={{ 
            background: isConnected ? 'var(--success-light)' : 'var(--warning-light)', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: `1px solid ${isConnected ? 'var(--success)' : 'var(--warning)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>{isConnected ? '✅' : '⚠️'}</span>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>{isConnected ? 'Email Connected' : 'Email Not Connected'}</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {isConnected ? 'Your email is monitored for job application responses.' : 'Connect your email to track application responses and receive alerts.'}
                </p>
              </div>
            </div>
          </div>

          {/* Step 1: Choose Provider */}
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ color: 'var(--text-primary)' }}>Step 1: Choose Email Provider</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {EMAIL_PROVIDERS.map(provider => (
                <div 
                  key={provider.id}
                  onClick={() => setConfig({...config, provider: provider.id})}
                  style={{
                    ...cardStyle,
                    background: config.provider === provider.id ? 'var(--info-light)' : 'var(--card-bg)',
                    borderColor: config.provider === provider.id ? 'var(--info)' : 'var(--border)'
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '5px' }}>{provider.icon}</div>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px', color: 'var(--text-primary)' }}>{provider.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{provider.recommendation}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: Access Method */}
          {config.provider && (
            <div style={{ marginBottom: '25px' }}>
              <h4 style={{ color: 'var(--text-primary)' }}>Step 2: Choose Access Method</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                {ACCESS_METHODS.map(method => (
                  <div 
                    key={method.id}
                    onClick={() => setConfig({...config, accessMethod: method.id})}
                    style={{
                      ...cardStyle,
                      background: config.accessMethod === method.id ? 'var(--success-light)' : 'var(--card-bg)',
                      borderColor: config.accessMethod === method.id ? 'var(--success)' : 'var(--border)'
                    }}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '5px' }}>{method.icon}</div>
                    <div style={{ fontWeight: 'bold', marginBottom: '3px', color: 'var(--text-primary)' }}>{method.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{method.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Configuration */}
          {config.accessMethod && (
            <div style={{ marginBottom: '25px' }}>
              <h4 style={{ color: 'var(--text-primary)' }}>Step 3: Configure Access</h4>
              
              <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
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
                    <div style={{ background: 'var(--info-light)', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--info)' }}>
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
                    <div style={{ background: 'var(--warning-light)', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--warning)' }}>
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
                  <button onClick={handleSave} style={{ padding: '12px 25px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    💾 Save Configuration
                  </button>
                  <button 
                    onClick={handleConnect} 
                    disabled={isConnected}
                    style={{ 
                      padding: '12px 25px', 
                      background: isConnected ? 'var(--success)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: isConnected ? 'default' : 'pointer', 
                      fontWeight: 'bold',
                      opacity: isConnected ? 1 : 1
                    }}
                  >
                    {isConnected ? '✅ Connected!' : '🔗 Connect Email'}
                  </button>
                  {isConnected && (
                    <button 
                      onClick={async () => {
                        await (window as any).electron.invoke?.('settings:update', { 
                          id: 1,
                          email_connected: false 
                        });
                        setIsConnected(false);
                      }} 
                      style={{ padding: '12px 15px', background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Manual Code Entry */}
          {showManualCode && (
            <div style={{ background: 'var(--warning-light)', padding: '20px', borderRadius: '8px', marginBottom: '25px', border: '1px dashed var(--warning)' }}>
              <h4 style={{ marginTop: 0, color: 'var(--warning)' }}>📋 Manual Code Entry</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>If the OAuth popup didn't close automatically, paste the authorization code here:</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  style={{...inputStyle, marginBottom: 0, flex: 1}} 
                  value={manualCode} 
                  onChange={e => setManualCode(e.target.value)}
                  placeholder="Paste authorization code..."
                />
                <button onClick={() => handleVerify(manualCode)} style={{ padding: '12px 20px', background: 'var(--warning)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Verify
                </button>
              </div>
            </div>
          )}

          {/* Secretary Access Section */}
          <div style={{ borderTop: '2px solid var(--border)', paddingTop: '25px', marginTop: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>👥 Secretary Email Access</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={config.secretaryEnabled} 
                  onChange={e => setConfig({...config, secretaryEnabled: e.target.checked})}
                />
                <span style={{ color: 'var(--text-primary)' }}>Enable Secretary Access</span>
              </label>
            </div>

            {config.secretaryEnabled && (
              <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 0 }}>
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
                        border: `2px solid ${config.secretaryAccessMethod === method.id ? 'var(--info)' : 'var(--border)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: config.secretaryAccessMethod === method.id ? 'var(--info-light)' : 'var(--card-bg)'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-primary)' }}>
                        {method.name}
                        {method.recommended && <span style={{ marginLeft: '5px', fontSize: '10px', background: 'var(--success)', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>Recommended</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{method.desc}</div>
                    </div>
                  ))}
                </div>

                <button onClick={handleSave} style={{ marginTop: '15px', padding: '12px 25px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  💾 Save Secretary Settings
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmailMonitoringSection;
