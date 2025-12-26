import { useState, useEffect } from 'react';
import './App.css';
import EmailMonitoringSection from './components/settings/EmailMonitoringSection';
import { EmailAlertsPanel } from './components/EmailAlertsPanel';

function App() {
  const [userId] = useState<number>(1);
  const [currentTab, setCurrentTab] = useState<'settings' | 'alerts' | 'monitoring'>('monitoring');

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🚀 Job Application Automation</h1>
        <p>Automate your job search and application process</p>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-button ${currentTab === 'monitoring' ? 'active' : ''}`}
          onClick={() => setCurrentTab('monitoring')}
        >
          📧 Email Monitoring
        </button>
        <button
          className={`nav-button ${currentTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setCurrentTab('alerts')}
        >
          🔔 Alerts
        </button>
        <button
          className={`nav-button ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentTab('settings')}
        >
          ⚙️ Settings
        </button>
      </nav>

      <main className="app-main">
        {currentTab === 'monitoring' && (
          <div>
            <h2>📧 Email Monitoring Setup</h2>
            <EmailMonitoringSection userId={userId} />
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px', marginTop: '20px' }}>
              <h3>✨ Phase 2.1 Features</h3>
              <ul>
                <li>✅ Gmail OAuth integration</li>
                <li>✅ Email monitoring (checks every hour)</li>
                <li>✅ Email classification (rejection, interview, offer, info needed)</li>
                <li>✅ Real-time alerts</li>
                <li>🔄 Coming soon: Follow-up scheduling</li>
                <li>🔄 Coming soon: Rejection response generation</li>
              </ul>
            </div>
          </div>
        )}

        {currentTab === 'alerts' && (
          <EmailAlertsPanel userId={userId} />
        )}

        {currentTab === 'settings' && (
          <div style={{ padding: '20px' }}>
            <h2>⚙️ Settings</h2>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
              <p>Settings panel coming soon...</p>
              <p style={{ fontSize: '12px', color: '#666' }}>
                Configure job preferences, AI models, email providers, and more.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;