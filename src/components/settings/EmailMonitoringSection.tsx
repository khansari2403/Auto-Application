import { useState, useEffect } from 'react';

export function EmailMonitoringSection({ userId }: { userId: number }) {
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [showManualBox, setShowManualBox] = useState(false);

  useEffect(() => {
    loadConfig();
    if ((window as any).electron.onGmailCodeReceived) {
      (window as any).electron.onGmailCodeReceived((code: string) => {
        handleVerify(code);
      });
    }
  }, [userId]);

  const loadConfig = async () => {
    const result = await (window as any).electron.getEmailConfig(userId);
    if (result?.success && result.data) {
      setGoogleClientId(result.data.google_client_id || '');
      setGoogleClientSecret(result.data.google_client_secret || '');
      setAccessToken(result.data.access_token || '');
    }
  };

  const handleVerify = async (code: string) => {
    const result = await (window as any).electron.exchangeCode(userId, code);
    if (result?.success) {
      setAccessToken(result.data.accessToken);
      setShowManualBox(false);
      alert('Connected successfully!');
    } else {
      alert('Error: ' + result.error);
    }
  };

  const handleSave = async () => {
    await (window as any).electron.saveEmailConfig({ userId, googleClientId, googleClientSecret });
    alert('Saved!');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>📧 Email Setup</h3>
      
      <div style={{ marginBottom: '20px', background: '#f4f4f4', padding: '15px', borderRadius: '8px' }}>
        <label>Client ID:</label>
        <input type="text" value={googleClientId} onChange={e => setGoogleClientId(e.target.value)} style={{ width: '100%', marginBottom: '10px' }} />
        <label>Client Secret:</label>
        <input type="password" value={googleClientSecret} onChange={e => setGoogleClientSecret(e.target.value)} style={{ width: '100%', marginBottom: '10px' }} />
        <button onClick={handleSave}>Save Credentials</button>
      </div>

      <p>Status: {accessToken ? '✅ Connected' : '❌ Not Connected'}</p>

      {!accessToken && (
        <>
          <button onClick={() => { (window as any).electron.getGmailAuthUrl(userId); setShowManualBox(true); }}>
            🔗 Connect Gmail
          </button>
          
          {showManualBox && (
            <div style={{ marginTop: '20px', padding: '10px', border: '1px dashed orange' }}>
              <p>If the popup didn't close automatically, paste the code from the URL here:</p>
              <input type="text" value={manualCode} onChange={e => setManualCode(e.target.value)} placeholder="Paste code here" />
              <button onClick={() => handleVerify(manualCode)}>Verify Manually</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default EmailMonitoringSection;