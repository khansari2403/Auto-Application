import { useState } from 'react';
import './App.css';
import SettingsPanel from './components/SettingsPanel';
import ActionLog from './components/ActionLog';
import EmailMonitoringSection from './components/settings/EmailMonitoringSection';
import EmailAlertsPanel from './components/EmailAlertsPanel';
import ApplicationsPanel from './components/ApplicationsPanel';
import { DocumentRepository } from './components/DocumentRepository';
import { SearchProfiles } from './components/SearchProfiles';
import { JobSearch } from './components/JobSearch'; // NEW

function App() {
  const [userId] = useState<number>(1);
  const [currentTab, setCurrentTab] = useState<'settings' | 'search' | 'applications' | 'logs' | 'monitoring' | 'alerts' | 'documents' | 'profiles'>('settings');

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>🚀 Job Application Automation</h1>
          <p>Automate your job search and application process</p>
        </div>
      </header>

      <nav className="app-nav">
        <button className={`nav-button ${currentTab === 'settings' ? 'active' : ''}`} onClick={() => setCurrentTab('settings')}>⚙️ Settings</button>
        <button className={`nav-button ${currentTab === 'documents' ? 'active' : ''}`} onClick={() => setCurrentTab('documents')}>📂 Documents</button>
        <button className={`nav-button ${currentTab === 'profiles' ? 'active' : ''}`} onClick={() => setCurrentTab('profiles')}>🔍 Search Profiles</button>
        <button className={`nav-button ${currentTab === 'search' ? 'active' : ''}`} onClick={() => setCurrentTab('search')}>🎯 Job Search</button>
        <button className={`nav-button ${currentTab === 'applications' ? 'active' : ''}`} onClick={() => setCurrentTab('applications')}>📋 Applications</button>
        <button className={`nav-button ${currentTab === 'monitoring' ? 'active' : ''}`} onClick={() => setCurrentTab('monitoring')}>📧 Email</button>
        <button className={`nav-button ${currentTab === 'alerts' ? 'active' : ''}`} onClick={() => setCurrentTab('alerts')}>🔔 Alerts</button>
        <button className={`nav-button ${currentTab === 'logs' ? 'active' : ''}`} onClick={() => setCurrentTab('logs')}>📊 Logs</button>
      </nav>

      <main className="app-main">
        {currentTab === 'settings' && <SettingsPanel userId={userId} />}
        {currentTab === 'documents' && <DocumentRepository userId={userId} />}
        {currentTab === 'profiles' && <SearchProfiles userId={userId} />}
        {currentTab === 'search' && <JobSearch userId={userId} />}
        {currentTab === 'applications' && <ApplicationsPanel userId={userId} />}
        {currentTab === 'monitoring' && <div><h2>📧 Email Monitoring Setup</h2><EmailMonitoringSection userId={userId} /></div>}
        {currentTab === 'alerts' && <EmailAlertsPanel userId={userId} />}
        {currentTab === 'logs' && <ActionLog userId={userId} />}
      </main>
    </div>
  );
}

export default App;