import { useState } from 'react';

interface EmailMonitoringSectionProps {
  userId: number;
}

export function EmailMonitoringSection({ userId }: EmailMonitoringSectionProps) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showAuthUrl, setShowAuthUrl] = useState(false);

  const handleConnectGmail = async () => {
    try {
      // Get Gmail auth URL from IPC
      const result = await (window as any).electron.getGmailAuthUrl?.();
      if (result?.url) {
        setAuthUrl(result.url);
        setShowAuthUrl(true);
      }
    } catch (error) {
      console.error('Failed to get Gmail auth URL:', error);
    }
  };

  const handleStartMonitoring = async () => {
    if (!accessToken) {
      alert('Please connect Gmail first');
      return;
    }
    try {
      const result = await (window as any).electron.startEmailMonitoring?.(userId, accessToken);
      if (result?.success) {
        setIsMonitoring(true);
        alert('Email monitoring started! Checking every hour.');
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  };

  const handleStopMonitoring = async () => {
    try {
      const result = await (window as any).electron.stopEmailMonitoring?.(userId);
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
      <h3>📧 Email Monitoring</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <p><strong>Status:</strong> {isMonitoring ? '✅ Active' : '⏸️ Inactive'}</p>
      </div>

      {!accessToken && (
        <div style={{ marginBottom: '15px' }}>
          <button 
            onClick={handleConnectGmail}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4285F4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            🔗 Connect Gmail
          </button>
        </div>
      )}

      {showAuthUrl && (
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <p><strong>Gmail Authorization URL:</strong></p>
          <p style={{ wordBreak: 'break-all', fontSize: '12px' }}>{authUrl}</p>
          <p style={{ fontSize: '12px', color: '#666' }}>
            Copy this URL to your browser, authorize the app, and paste the code below.
          </p>
          <input 
            type="text" 
            placeholder="Paste authorization code here"
            onChange={(e) => setAccessToken(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '10px' }}
          />
        </div>
      )}

      {accessToken && (
        <div style={{ marginBottom: '15px' }}>
          <button 
            onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
            style={{
              padding: '10px 20px',
              backgroundColor: isMonitoring ? '#d32f2f' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {isMonitoring ? '⏹️ Stop Monitoring' : '▶️ Start Monitoring'}
          </button>
        </div>
      )}

      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
        <p style={{ fontSize: '12px', margin: '0' }}>
          <strong>ℹ️ Info:</strong> Email monitoring checks for new emails every hour and alerts you to important messages from employers.
        </p>
      </div>
    </div>
  );
}

export default EmailMonitoringSection;