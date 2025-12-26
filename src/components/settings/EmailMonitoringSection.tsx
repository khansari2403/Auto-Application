import { useState, useEffect } from 'react';

interface EmailMonitoringSectionProps {
  userId: number;
}

export function EmailMonitoringSection({ userId }: EmailMonitoringSectionProps) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showAuthUrl, setShowAuthUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // NEW: Load saved data when the component opens
  useEffect(() => {
    loadConfig();
  }, [userId]);

  const loadConfig = async () => {
    try {
      const result = await (window as any).electron.getEmailConfig(userId);
      if (result?.success && result.data) {
        setGoogleClientId(result.data.google_client_id || '');
        setGoogleClientSecret(result.data.google_client_secret || '');
        if (result.data.access_token) {
          setAccessToken(result.data.access_token);
        }
      }
    } catch (error) {
      console.error('Failed to load email config:', error);
    }
  };

  const handleSaveCredentials = async () => {
    setIsSaving(true);
    try {
      const result = await (window as any).electron.saveEmailConfig({
        userId,
        emailProvider: 'gmail',
        googleClientId,
        googleClientSecret
      });
      if (result?.success) {
        alert('Credentials saved successfully!');
      } else {
        alert('Failed to save: ' + result?.error);
      }
    } catch (error) {
      alert('Error saving credentials');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectGmail = async () => {
    if (!googleClientId || !googleClientSecret) {
      alert('Please enter and save your Google Client ID and Secret first');
      return;
    }
    try {
      const result = await (window as any).electron.getGmailAuthUrl(userId);
      if (result?.success && result.url) {
        setAuthUrl(result.url);
        setShowAuthUrl(true);
      }
    } catch (error) {
      console.error('Failed to get Gmail auth URL:', error);
    }
  };

  const handleVerifyCode = async () => {
    const codeInput = document.getElementById('authCodeInput') as HTMLInputElement;
    const code = codeInput?.value;
    if (!code) {
      alert('Please paste the code from Google');
      return;
    }
    try {
      const result = await (window as any).electron.exchangeCode(userId, code);
      if (result?.success) {
        setAccessToken(result.data.accessToken);
        setShowAuthUrl(false);
        alert('Successfully connected to Gmail!');
      } else {
        alert('Failed to verify code: ' + result?.error);
      }
    } catch (error) {
      console.error('Failed to exchange code:', error);
    }
  };

  const handleStartMonitoring = async () => {
    try {
      const result = await (window as any).electron.startEmailMonitoring(userId, accessToken);
      if (result?.success) {
        setIsMonitoring(true);
        alert('Email monitoring started!');
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  };

  const handleStopMonitoring = async () => {
    try {
      const result = await (window as any).electron.stopEmailMonitoring(userId);
      if (result?.success) {
        setIsMonitoring(false);
        alert('Email monitoring stopped');
      }
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>📧 Email Monitoring Setup</h3>
      
      {/* SECTION 1: CREDENTIALS */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
        <h4>1. Google API Credentials</h4>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '14px' }}>Client ID:</label>
          <input 
            type="text" 
            value={googleClientId}
            onChange={(e) => setGoogleClientId(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontSize: '14px' }}>Client Secret:</label>
          <input 
            type="password" 
            value={googleClientSecret}
            onChange={(e) => setGoogleClientSecret(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <button 
          onClick={handleSaveCredentials}
          disabled={isSaving}
          style={{ padding: '8px 16px', backgroundColor: '#673ab7', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {isSaving ? 'Saving...' : '💾 Save Credentials'}
        </button>
      </div>

      {/* SECTION 2: CONNECTION */}
      <div style={{ marginBottom: '20px' }}>
        <h4>2. Connection Status</h4>
        <p><strong>Monitoring:</strong> {isMonitoring ? '✅ Active' : '⏸️ Inactive'}</p>
        <p><strong>Gmail:</strong> {accessToken ? '✅ Connected' : '❌ Not Connected'}</p>
      </div>

      {!accessToken && (
        <button 
          onClick={handleConnectGmail}
          style={{ padding: '10px 20px', backgroundColor: '#4285F4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          🔗 Connect Gmail Account
        </button>
      )}

      {showAuthUrl && (
        <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#fff3e0', borderRadius: '8px', border: '1px solid #ffe0b2' }}>
          <p><strong>Step 1:</strong> Copy this URL to your browser:</p>
          <p style={{ wordBreak: 'break-all', fontSize: '11px', color: '#e65100' }}>{authUrl}</p>
          <p style={{ marginTop: '10px' }}><strong>Step 2:</strong> Paste the code from Google here:</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" id="authCodeInput" style={{ flex: 1, padding: '8px' }} />
            <button onClick={handleVerifyCode} style={{ padding: '8px 16px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '4px' }}>
              Verify Code
            </button>
          </div>
        </div>
      )}

      {accessToken && (
        <button 
          onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
          style={{ padding: '10px 20px', backgroundColor: isMonitoring ? '#d32f2f' : '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {isMonitoring ? '⏹️ Stop Monitoring' : '▶️ Start Monitoring'}
        </button>
      )}
    </div>
  );
}

export default EmailMonitoringSection;