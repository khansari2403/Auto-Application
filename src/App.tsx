import { useState, useEffect } from 'react';
import './App.css';
import SettingsPanel from './components/SettingsPanel';
import ActionLog from './components/ActionLog';
import EmailMonitoringSection from './components/settings/EmailMonitoringSection';
import { EmailAlertsPanel } from './components/EmailAlertsPanel';

function App() {
  const [userId] = useState<number>(1);
  const [currentTab, setCurrentTab] = useState<'settings' | 'search' | 'applications' | 'logs' | 'monitoring' | 'alerts'>('settings');

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>🚀 Job Application Automation</h1>
          <p>Automate your job search and application process</p>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-button ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentTab('settings')}
        >
          ⚙️ Settings & Configuration
        </button>
        <button
          className={`nav-button ${currentTab === 'search' ? 'active' : ''}`}
          onClick={() => setCurrentTab('search')}
        >
          🔍 Job Search
        </button>
        <button
          className={`nav-button ${currentTab === 'applications' ? 'active' : ''}`}
          onClick={() => setCurrentTab('applications')}
        >
          📋 Applications
        </button>
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
          className={`nav-button ${currentTab === 'logs' ? 'active' : ''}`}
          onClick={() => setCurrentTab('logs')}
        >
          📊 Activity Logs
        </button>
      </nav>

      <main className="app-main">
        {currentTab === 'settings' && (
          <div>
            <h2>⚙️ Settings & Configuration</h2>
            <SettingsPanel userId={userId} />
          </div>
        )}

        {currentTab === 'search' && (
          <div style={{ padding: '20px' }}>
            <h2>🔍 Job Search</h2>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
              <p>Job search functionality coming soon...</p>
              <p style={{ fontSize: '12px', color: '#666' }}>
                Search across LinkedIn, Glassdoor, Xing, Indeed, and custom job boards.
              </p>
            </div>
          </div>
        )}

        {currentTab === 'applications' && (
          <div style={{ padding: '20px' }}>
            <h2>📋 Applications</h2>
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
              <p>Application tracking coming soon...</p>
              <p style={{ fontSize: '12px', color: '#666' }}>
                Track all your job applications, CVs, motivation letters, and application status.
              </p>
            </div>
          </div>
        )}

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

        {currentTab === 'logs' && (
          <div>
            <h2>📊 Activity Logs</h2>
            <ActionLog userId={userId} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;