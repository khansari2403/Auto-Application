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
  { id: 'app_password', name: 'App-Specific Password', description: 'Create a password just for this app', icon: '🔑' }
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
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [inboxMessages, setInboxMessages] = useState<any[]>([]);
  const [isLoadingInbox, setIsLoadingInbox] = useState(false);
  const [inboxTotalCount, setInboxTotalCount] = useState(0);
  const [oauthInProgress, setOauthInProgress] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [userId]);

  const loadConfig = async () => {
    const result = await (window as any).electron.invoke?.('settings:get', userId);
    if (result?.success && result.data) {
      setGoogleClientId(result.data.google_client_id || '');
      setGoogleClientSecret(result.data.google_client_secret || '');
      const wasConnected = !!result.data.email_connected;
      setIsConnected(wasConnected);
      
      if (result.data.email_provider) {
        setConfig({
          ...config,
          provider: result.data.email_provider,
          email: result.data.email || '',
          accessMethod: result.data.email_access_method || '',
          appPassword: result.data.email_app_password || ''
        });
        
        if (wasConnected) {
          if (result.data.email_access_method === 'oauth' && result.data.oauth_access_token) {
            verifyOAuthConnection(true);
          } else if (result.data.email_app_password) {
            verifyConnection(result.data.email, result.data.email_app_password, result.data.email_provider, true);
          }
        }
      }
    }
  };

  const verifyOAuthConnection = async (silent: boolean = false) => {
    if (!silent) setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await (window as any).electron.invoke?.('email:oauth-test', {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        email: config.email
      });
      
      if (result?.success) {
        setIsConnected(true);
        if (!silent) {
          setTestResult({ success: true, message: `Connected as ${result.email}` });
          if (result.messages) {
            setInboxMessages(result.messages);
            setInboxTotalCount(result.totalMessages || 0);
          }
        }
      } else {
        if (!silent) {
          setIsConnected(false);
          setTestResult({ success: false, error: result?.error || 'OAuth verification failed' });
        }
      }
    } catch (e: any) {
      if (!silent) setTestResult({ success: false, error: e.message });
    } finally {
      if (!silent) setIsTesting(false);
    }
  };

  const verifyConnection = async (email: string, password: string, provider: string, silent: boolean = false) => {
    if (!silent) setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await (window as any).electron.invoke?.('email:test-inbox', { email, password, provider });
      
      if (result?.success) {
        setIsConnected(true);
        if (!silent) setTestResult({ success: true, message: result.message || 'Connection verified!' });
        await (window as any).electron.invoke?.('settings:update', { id: 1, email_connected: true });
      } else {
        setIsConnected(false);
        if (!silent) setTestResult({ success: false, error: result?.error || 'Connection failed' });
        await (window as any).electron.invoke?.('settings:update', { id: 1, email_connected: false });
      }
    } catch (e: any) {
      if (!silent) setTestResult({ success: false, error: e.message });
      setIsConnected(false);
    } finally {
      if (!silent) setIsTesting(false);
    }
  };

  const startOAuthFlow = async () => {
    if (!googleClientId || !googleClientSecret) {
      setTestResult({ success: false, error: 'Please enter Client ID and Client Secret first' });
      return;
    }
    
    setOauthInProgress(true);
    setTestResult({ success: true, message: 'Opening browser... Please sign in with Google.' });
    
    try {
      const result = await (window as any).electron.invoke?.('email:oauth-start', {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        email: config.email
      });
      
      if (result?.success) {
        // With loopback method, OAuth completes automatically
        setIsConnected(true);
        setShowManualCode(false);
        setOauthInProgress(false);
        
        // Save credentials
        await (window as any).electron.invoke?.('settings:update', { 
          id: 1,
          google_client_id: googleClientId, 
          google_client_secret: googleClientSecret,
          email_provider: config.provider,
          email: config.email,
          email_access_method: config.accessMethod,
          email_connected: true
        });
        
        setTestResult({ success: true, message: result.message || '✅ Email connected successfully!' });
        
        // Verify connection and fetch inbox
        setTimeout(() => verifyOAuthConnection(false), 1500);
      } else {
        // Check if it's a redirect_uri error
        if (result?.error?.includes('redirect_uri') || result?.error?.includes('127.0.0.1')) {
          setTestResult({ 
            success: false, 
            error: `OAuth Configuration Error: Please add "http://127.0.0.1" as an Authorized redirect URI in your Google Cloud Console. Go to: APIs & Services > Credentials > Your OAuth Client > Authorized redirect URIs`
          });
        } else {
          setTestResult({ success: false, error: result?.error || 'OAuth failed. Please try again.' });
        }
        setOauthInProgress(false);
      }
    } catch (e: any) {
      setTestResult({ success: false, error: e.message });
      setOauthInProgress(false);
    }
  };

  const submitOAuthCode = async () => {
    if (!manualCode.trim()) {
      setTestResult({ success: false, error: 'Please paste the authorization code' });
      return;
    }
    
    setIsTesting(true);
    
    try {
      const result = await (window as any).electron.invoke?.('email:oauth-callback', {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        code: manualCode.trim(),
        email: config.email
      });
      
      if (result?.success) {
        await (window as any).electron.invoke?.('settings:update', { 
          id: 1,
          google_client_id: googleClientId, 
          google_client_secret: googleClientSecret,
          email_provider: config.provider,
          email: config.email,
          email_access_method: config.accessMethod,
          email_connected: true
        });
        
        setIsConnected(true);
        setShowManualCode(false);
        setManualCode('');
        setOauthInProgress(false);
        setTestResult({ success: true, message: result.message || 'Email connected via OAuth!' });
        
        setTimeout(() => verifyOAuthConnection(false), 1000);
      } else {
        setTestResult({ success: false, error: result?.error || 'Failed to verify OAuth code' });
      }
    } catch (e: any) {
      setTestResult({ success: false, error: e.message });
    } finally {
      setIsTesting(false);
    }
  };

  const fetchInboxPreview = async () => {
    if (!config.email || !config.appPassword) {
      alert('Please enter email and app password first');
      return;
    }
    
    setIsLoadingInbox(true);
    setInboxMessages([]);
    
    try {
      const result = await (window as any).electron.invoke?.('email:fetch-inbox', {
        email: config.email,
        password: config.appPassword,
        provider: config.provider,
        maxMessages: 5
      });
      
      if (result?.success) {
        setInboxMessages(result.messages || []);
        setInboxTotalCount(result.totalCount || 0);
        setIsConnected(true);
        await (window as any).electron.invoke?.('settings:update', { id: 1, email_connected: true });
      } else {
        setTestResult({ success: false, error: result?.error || 'Failed to fetch inbox' });
        setIsConnected(false);
      }
    } catch (e: any) {
      setTestResult({ success: false, error: e.message });
    } finally {
      setIsLoadingInbox(false);
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
    if (config.accessMethod === 'app_password') {
      if (!config.email || !config.appPassword) {
        alert('Please enter email and app password');
        return;
      }
      
      setIsTesting(true);
      const testResult = await (window as any).electron.invoke?.('email:test-inbox', {
        email: config.email,
        password: config.appPassword,
        provider: config.provider
      });
      setIsTesting(false);
      
      if (testResult?.success) {
        await (window as any).electron.invoke?.('settings:update', { 
          id: 1,
          google_client_id: googleClientId, 
          google_client_secret: googleClientSecret,
          email_provider: config.provider,
          email: config.email,
          email_access_method: config.accessMethod,
          email_app_password: config.appPassword,
          email_connected: true
        });
        setIsConnected(true);
        setTestResult({ success: true, message: 'Email connected and verified!' });
      } else {
        setTestResult({ success: false, error: testResult?.error || 'Connection failed. Check your credentials.' });
      }
    }
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

                {/* OAuth Section */}
                {config.accessMethod === 'oauth' && (
                  <div>
                    <div style={{ background: 'var(--info-light)', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--info)' }}>
                        <strong>OAuth Setup:</strong> Create OAuth credentials in Google Cloud Console, enable Gmail API, add your email to Test Users.
                      </p>
                    </div>
                    <label style={labelStyle}>Client ID</label>
                    <input style={inputStyle} value={googleClientId} onChange={e => setGoogleClientId(e.target.value)} placeholder="Your OAuth Client ID" />
                    <label style={labelStyle}>Client Secret</label>
                    <input style={inputStyle} type="password" value={googleClientSecret} onChange={e => setGoogleClientSecret(e.target.value)} placeholder="Your OAuth Client Secret" />
                    
                    {!isConnected && (
                      <button 
                        onClick={startOAuthFlow}
                        disabled={oauthInProgress || !googleClientId || !googleClientSecret}
                        style={{ 
                          width: '100%', padding: '14px 25px', 
                          background: oauthInProgress 
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                            : 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)', 
                          color: '#fff', border: 'none', borderRadius: '6px', 
                          cursor: oauthInProgress ? 'wait' : 'pointer', 
                          fontWeight: 'bold', fontSize: '14px', marginTop: '10px',
                          opacity: (!googleClientId || !googleClientSecret) ? 0.5 : 1
                        }}
                      >
                        {oauthInProgress ? '⏳ Connecting... Please complete sign-in in browser' : '🔐 Connect with Google'}
                      </button>
                    )}
                    
                    {/* Manual code fallback - kept for edge cases */}
                    {showManualCode && (
                      <div style={{ marginTop: '15px', padding: '15px', background: 'var(--warning-light)', borderRadius: '8px', border: '1px solid var(--warning)' }}>
                        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--warning)' }}>
                          <strong>Manual Code Entry (Fallback):</strong> If the automatic connection didn't work, paste the authorization code here:
                        </p>
                        <input 
                          style={{ ...inputStyle, marginBottom: '10px' }} 
                          value={manualCode} 
                          onChange={e => setManualCode(e.target.value)}
                          placeholder="Paste the authorization code here..."
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button 
                            onClick={submitOAuthCode}
                            disabled={isTesting || !manualCode.trim()}
                            style={{ flex: 1, padding: '12px', background: '#4285f4', color: '#fff', border: 'none', borderRadius: '6px', cursor: isTesting ? 'wait' : 'pointer', fontWeight: 'bold' }}
                          >
                            {isTesting ? '⏳ Verifying...' : '✓ Submit Code'}
                          </button>
                          <button 
                            onClick={() => { setShowManualCode(false); setManualCode(''); setOauthInProgress(false); }}
                            style={{ padding: '12px 20px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {isConnected && (
                      <button 
                        onClick={() => verifyOAuthConnection(false)}
                        disabled={isTesting}
                        style={{ width: '100%', padding: '14px 25px', background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: '#fff', border: 'none', borderRadius: '6px', cursor: isTesting ? 'wait' : 'pointer', fontWeight: 'bold', fontSize: '14px', marginTop: '10px' }}
                      >
                        {isTesting ? '⏳ Testing...' : '📬 Test Connection - View Inbox'}
                      </button>
                    )}
                  </div>
                )}

                {/* App Password Section */}
                {config.accessMethod === 'app_password' && (
                  <div>
                    <div style={{ background: 'var(--warning-light)', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--warning)' }}>
                        <strong>App Password:</strong> Generate an app-specific password in your email provider's security settings.
                        {config.provider === 'gmail' && <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ marginLeft: '5px' }}>Gmail App Passwords</a>}
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
                    
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
                      <button onClick={handleSave} style={{ padding: '12px 25px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                        💾 Save Configuration
                      </button>
                      <button 
                        onClick={handleConnect} 
                        disabled={isTesting}
                        style={{ padding: '12px 25px', background: isConnected ? 'var(--success)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', border: 'none', borderRadius: '6px', cursor: isTesting ? 'wait' : 'pointer', fontWeight: 'bold', opacity: isTesting ? 0.7 : 1 }}
                      >
                        {isTesting ? '⏳ Testing...' : isConnected ? '✅ Connected!' : '🔗 Connect Email'}
                      </button>
                      {isConnected && (
                        <>
                          <button 
                            onClick={fetchInboxPreview}
                            disabled={isLoadingInbox}
                            style={{ padding: '12px 20px', background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: '#fff', border: 'none', borderRadius: '6px', cursor: isLoadingInbox ? 'wait' : 'pointer', fontWeight: 'bold', opacity: isLoadingInbox ? 0.7 : 1 }}
                          >
                            {isLoadingInbox ? '⏳ Loading...' : '📬 Test: View Inbox'}
                          </button>
                          <button 
                            onClick={async () => {
                              await (window as any).electron.invoke?.('settings:update', { id: 1, email_connected: false });
                              setIsConnected(false);
                              setInboxMessages([]);
                              setTestResult(null);
                            }} 
                            style={{ padding: '12px 15px', background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Disconnect
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Test Result Display */}
                {testResult && (
                  <div style={{ background: testResult.success ? 'var(--success-light)' : 'var(--danger-light)', padding: '12px', borderRadius: '6px', marginTop: '15px', border: `1px solid ${testResult.success ? 'var(--success)' : 'var(--danger)'}` }}>
                    <p style={{ margin: 0, fontSize: '13px', color: testResult.success ? 'var(--success)' : 'var(--danger)' }}>
                      {testResult.success ? '✅ ' : '❌ '}{testResult.message || testResult.error}
                    </p>
                  </div>
                )}

                {/* Disconnect for OAuth */}
                {config.accessMethod === 'oauth' && isConnected && (
                  <button 
                    onClick={async () => {
                      await (window as any).electron.invoke?.('settings:update', { id: 1, email_connected: false, oauth_access_token: null, oauth_refresh_token: null });
                      setIsConnected(false);
                      setInboxMessages([]);
                      setTestResult(null);
                    }} 
                    style={{ marginTop: '15px', padding: '12px 20px', background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    🔌 Disconnect OAuth
                  </button>
                )}

                {/* Inbox Preview */}
                {inboxMessages.length > 0 && (
                  <div style={{ marginTop: '20px', padding: '15px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '14px' }}>
                      📬 Inbox Preview ({inboxMessages.length} of {inboxTotalCount} messages)
                    </h4>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {inboxMessages.map((msg, i) => (
                        <div key={i} style={{ padding: '12px', background: 'var(--card-bg)', borderRadius: '6px', marginBottom: '8px', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                              {msg.from?.length > 40 ? msg.from.substring(0, 40) + '...' : msg.from}
                            </strong>
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                              {msg.date ? new Date(msg.date).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {msg.subject?.length > 60 ? msg.subject.substring(0, 60) + '...' : msg.subject}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: 'var(--success)' }}>
                      ✓ Connection verified! Your inbox is accessible.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EmailMonitoringSection;
