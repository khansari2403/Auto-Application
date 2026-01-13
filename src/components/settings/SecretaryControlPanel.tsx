import { useState, useEffect } from 'react';

interface Props {
  userId: number;
}

interface SecretarySettings {
  enabled: boolean;
  followUpDelay: number; // hours after application
  sendThanksConfirmation: boolean;
  notifyUserEmail: string;
  notifyOnResponse: boolean;
  notifyOnFollowUp: boolean;
  notifyOnVerification: boolean;
  lastCheckTime?: string;
}

const defaultSettings: SecretarySettings = {
  enabled: false,
  followUpDelay: 48, // 48 hours default
  sendThanksConfirmation: true,
  notifyUserEmail: '',
  notifyOnResponse: true,
  notifyOnFollowUp: true,
  notifyOnVerification: true
};

export function SecretaryControlPanel({ userId }: Props) {
  const [settings, setSettings] = useState<SecretarySettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      const result = await (window as any).electron.invoke('settings:get', userId);
      if (result?.success && result.data?.secretary_settings) {
        const saved = JSON.parse(result.data.secretary_settings);
        setSettings({ ...defaultSettings, ...saved });
      }
    } catch (e) {
      console.error('Failed to load secretary settings:', e);
    }
  };

  useEffect(() => { loadSettings(); }, [userId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await (window as any).electron.invoke('settings:update', { 
        id: 1, 
        secretary_settings: JSON.stringify(settings) 
      });
      setLastSaved(new Date().toLocaleTimeString());
    } catch (e: any) {
      alert('Error saving settings: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!settings.notifyUserEmail) {
      alert('Please enter your personal email first.');
      return;
    }
    
    // For testing purposes - in real implementation this would send an email
    alert(`Test notification would be sent to: ${settings.notifyUserEmail}\n\nNote: Email integration requires SMTP configuration.`);
  };

  return (
    <div style={{ padding: '20px', background: 'var(--bg-primary)' }}>
      <h3 style={{ marginTop: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        🤖 Secretary Assistant Settings
        {settings.enabled && <span style={{ fontSize: '12px', background: 'var(--success)', color: '#fff', padding: '2px 8px', borderRadius: '10px' }}>Active</span>}
      </h3>
      
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
        Configure your virtual secretary to monitor emails, send follow-ups, and notify you about application responses.
      </p>

      {/* Master Toggle */}
      <div style={{ 
        background: settings.enabled ? 'var(--success-light)' : 'var(--bg-secondary)', 
        padding: '15px 20px', 
        borderRadius: '10px', 
        marginBottom: '20px',
        border: `1px solid ${settings.enabled ? 'var(--success)' : 'var(--border)'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Secretary Assistant</strong>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {settings.enabled ? 'Monitoring your emails for application responses' : 'Currently disabled'}
          </p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={settings.enabled}
            onChange={e => setSettings(s => ({ ...s, enabled: e.target.checked }))}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
          <span style={{ marginLeft: '8px', fontWeight: 'bold', color: settings.enabled ? 'var(--success)' : 'var(--text-tertiary)' }}>
            {settings.enabled ? 'ON' : 'OFF'}
          </span>
        </label>
      </div>

      {/* Follow-up Timing */}
      <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '10px', marginBottom: '15px', border: '1px solid var(--border)' }}>
        <label style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '14px' }}>
          ⏰ Follow-up Timing
        </label>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px', marginBottom: '10px' }}>
          How long to wait after application submission before sending a follow-up inquiry
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[24, 48, 72, 96, 168].map(hours => (
            <button
              key={hours}
              onClick={() => setSettings(s => ({ ...s, followUpDelay: hours }))}
              style={{
                padding: '8px 16px',
                border: `1px solid ${settings.followUpDelay === hours ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: '20px',
                background: settings.followUpDelay === hours ? 'var(--primary)' : 'var(--card-bg)',
                color: settings.followUpDelay === hours ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              {hours < 48 ? `${hours}h` : `${hours / 24} days`}
            </button>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="number"
              min="1"
              max="720"
              value={settings.followUpDelay}
              onChange={e => setSettings(s => ({ ...s, followUpDelay: parseInt(e.target.value) || 48 }))}
              style={{
                width: '60px',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                textAlign: 'center'
              }}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>hours</span>
          </div>
        </div>
      </div>

      {/* Confirmation Email */}
      <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '10px', marginBottom: '15px', border: '1px solid var(--border)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.sendThanksConfirmation}
            onChange={e => setSettings(s => ({ ...s, sendThanksConfirmation: e.target.checked }))}
            style={{ width: '18px', height: '18px' }}
          />
          <div>
            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>📧 Send "Thanks for Confirmation" Email</span>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Automatically reply to acknowledge receipt of their confirmation email
            </p>
          </div>
        </label>
      </div>

      {/* Personal Email Notifications */}
      <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '10px', marginBottom: '15px', border: '1px solid var(--border)' }}>
        <label style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '14px' }}>
          📬 Personal Email Notifications
        </label>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px', marginBottom: '10px' }}>
          Get notified on your personal email when important events happen
        </p>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px', display: 'block' }}>
            Your Personal Email (for notifications)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              value={settings.notifyUserEmail}
              onChange={e => setSettings(s => ({ ...s, notifyUserEmail: e.target.value }))}
              placeholder="your.personal@email.com"
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            />
            <button
              onClick={handleTestEmail}
              style={{
                padding: '10px 15px',
                background: 'var(--info)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                whiteSpace: 'nowrap'
              }}
            >
              Test 📤
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.notifyOnResponse}
              onChange={e => setSettings(s => ({ ...s, notifyOnResponse: e.target.checked }))}
              style={{ width: '16px', height: '16px' }}
            />
            <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
              🔔 Notify me when a company responds to my application
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.notifyOnFollowUp}
              onChange={e => setSettings(s => ({ ...s, notifyOnFollowUp: e.target.checked }))}
              style={{ width: '16px', height: '16px' }}
            />
            <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
              📨 Notify me when a follow-up email is sent
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.notifyOnVerification}
              onChange={e => setSettings(s => ({ ...s, notifyOnVerification: e.target.checked }))}
              style={{ width: '16px', height: '16px' }}
            />
            <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
              ✅ Notify me when account verification is needed
            </span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          {lastSaved && `Last saved: ${lastSaved}`}
        </span>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: '12px 30px',
            background: 'var(--success)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            opacity: isSaving ? 0.7 : 1
          }}
        >
          {isSaving ? '⏳ Saving...' : '💾 Save Settings'}
        </button>
      </div>

      {/* Status Info */}
      {settings.enabled && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: 'var(--info-light)', 
          borderRadius: '10px',
          border: '1px solid var(--info)'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--info)' }}>📊 Secretary Status</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', fontSize: '13px' }}>
            <div style={{ color: 'var(--text-primary)' }}>
              <strong>Follow-up timer:</strong> {settings.followUpDelay}h after submission
            </div>
            <div style={{ color: 'var(--text-primary)' }}>
              <strong>Auto-reply:</strong> {settings.sendThanksConfirmation ? 'Enabled' : 'Disabled'}
            </div>
            <div style={{ color: 'var(--text-primary)' }}>
              <strong>Notifications:</strong> {settings.notifyUserEmail || 'Not configured'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecretaryControlPanel;
