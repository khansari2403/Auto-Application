import { useState } from 'react';
import './App.css';
import SettingsPanel from './components/SettingsPanel';
import ActionLog from './components/ActionLog';
import EmailAlertsPanel from './components/EmailAlertsPanel';
import ApplicationsPanel from './components/ApplicationsPanel';
import { DocumentRepository } from './components/DocumentRepository';
import { SearchProfiles } from './components/SearchProfiles';
import { JobSearch } from './components/JobSearch';
import { ApplicationInbox } from './components/ApplicationInbox';
import JobWebsitesSection from './components/settings/JobWebsitesSection';

/**
 * Main Application Component
 * Navigation updated for Phase 3.6 with Tutorial and Info tabs.
 * CRITICAL: All high-intelligence features preserved.
 */
function App() {
  const [userId] = useState<number>(1);
  const [currentTab, setCurrentTab] = useState<'settings' | 'documents' | 'websites' | 'profiles' | 'search' | 'applications' | 'inbox' | 'alerts' | 'logs' | 'tutorial' | 'why_free'>('settings');

  // Function to handle external jumps for the new tabs
  const openExternalLink = (url: string) => {
    // This will be updated with your specific URLs later
    window.open(url, '_blank');
  };

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
        <button className={`nav-button ${currentTab === 'websites' ? 'active' : ''}`} onClick={() => setCurrentTab('websites')}>🌐 Job Websites</button>
        <button className={`nav-button ${currentTab === 'profiles' ? 'active' : ''}`} onClick={() => setCurrentTab('profiles')}>🔍 Search Profiles</button>
        <button className={`nav-button ${currentTab === 'search' ? 'active' : ''}`} onClick={() => setCurrentTab('search')}>🎯 Job Search</button>
        <button className={`nav-button ${currentTab === 'applications' ? 'active' : ''}`} onClick={() => setCurrentTab('applications')}>📋 Applications</button>
        <button className={`nav-button ${currentTab === 'inbox' ? 'active' : ''}`} onClick={() => setCurrentTab('inbox')}>📬 Inbox</button>
        <button className={`nav-button ${currentTab === 'alerts' ? 'active' : ''}`} onClick={() => setCurrentTab('alerts')}>🔔 Alerts</button>
        <button className={`nav-button ${currentTab === 'logs' ? 'active' : ''}`} onClick={() => setCurrentTab('logs')}>📊 Logs</button>
        
        {/* NEW TABS FOR PHASE 3.6 */}
        <button className="nav-button secondary" onClick={() => openExternalLink('https://your-tutorial-link.com')}>📖 Tutorial</button>
        <button className="nav-button secondary" onClick={() => openExternalLink('https://your-info-link.com')}>❓ Why Free?</button>
      </nav>

      <main className="app-main">
        {currentTab === 'settings' && <SettingsPanel userId={userId} />}
        {currentTab === 'documents' && <DocumentRepository userId={userId} />}
        {currentTab === 'websites' && <JobWebsitesSection userId={userId} />}
        {currentTab === 'profiles' && <SearchProfiles userId={userId} />}
        {currentTab === 'search' && <JobSearch userId={userId} />}
        {currentTab === 'applications' && <ApplicationsPanel userId={userId} />}
        {currentTab === 'inbox' && <ApplicationInbox userId={userId} />}
        {currentTab === 'alerts' && <EmailAlertsPanel userId={userId} />}
        {currentTab === 'logs' && <ActionLog userId={userId} />}
      </main>
    </div>
  );
}

export default App;