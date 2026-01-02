import { useState } from 'react';
import './styles/app.css';
import './App.css';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeSelector } from './components/common/ThemeSelector';
import { LanguageSelector } from './components/common/LanguageSelector';
import { BugReportModal } from './components/common/BugReportModal';
import SettingsPanel from './components/SettingsPanel';
import ActionLog from './components/ActionLog';
import EmailAlertsPanel from './components/EmailAlertsPanel';
import ApplicationsPanel from './components/ApplicationsPanel';
import { DocumentRepository } from './components/DocumentRepository';
import { SearchProfiles } from './components/SearchProfiles';
import { JobSearch } from './components/JobSearch';
import { ApplicationInbox } from './components/ApplicationInbox';
import JobWebsitesSection from './components/settings/JobWebsitesSection';

type TabType = 'settings' | 'documents' | 'websites' | 'profiles' | 'search' | 'applications' | 'inbox' | 'alerts' | 'logs';

const tabNames: Record<TabType, string> = {
  settings: 'Settings',
  documents: 'Documents',
  websites: 'Job Websites',
  profiles: 'Search Profiles',
  search: 'Job Search',
  applications: 'Applications',
  inbox: 'Inbox',
  alerts: 'Alerts',
  logs: 'Logs',
};

/**
 * Main App Content Component
 */
function AppContent() {
  const [userId] = useState<number>(1);
  const [currentTab, setCurrentTab] = useState<TabType>('settings');
  const [showBugReport, setShowBugReport] = useState(false);
  const { t } = useLanguage();
  const { style, mode } = useTheme();

  const openExternalLink = (url: string) => {
    if (url === 'tutorial') {
      window.open('https://your-tutorial-website.com', '_blank');
    } else if (url === 'why_free') {
      window.open('https://your-info-website.com', '_blank');
    }
  };

  const navItems: { tab: TabType; labelKey: keyof typeof t }[] = [
    { tab: 'settings', labelKey: 'settings' },
    { tab: 'documents', labelKey: 'documents' },
    { tab: 'websites', labelKey: 'jobWebsites' },
    { tab: 'profiles', labelKey: 'searchProfiles' },
    { tab: 'search', labelKey: 'jobSearch' },
    { tab: 'applications', labelKey: 'applications' },
    { tab: 'inbox', labelKey: 'inbox' },
    { tab: 'alerts', labelKey: 'alerts' },
    { tab: 'logs', labelKey: 'logs' },
  ];

  return (
    <div className="app-container" data-testid="app-container">
      <header className="app-header" data-testid="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>{t('appTitle')}</h1>
            <p>{t('appSubtitle')}</p>
          </div>
          <div className="header-controls">
            <ThemeSelector />
            <LanguageSelector />
          </div>
        </div>
      </header>

      <nav className="app-nav" data-testid="app-nav">
        {navItems.map(({ tab, labelKey }) => (
          <button
            key={tab}
            className={`nav-button ${currentTab === tab ? 'active' : ''}`}
            onClick={() => setCurrentTab(tab)}
            data-testid={`nav-${tab}`}
          >
            {t(labelKey)}
          </button>
        ))}
        
        {/* External Links */}
        <button 
          className="nav-button secondary" 
          onClick={() => openExternalLink('tutorial')}
          data-testid="nav-tutorial"
        >
          {t('tutorial')}
        </button>
        <button 
          className="nav-button secondary" 
          onClick={() => openExternalLink('why_free')}
          data-testid="nav-why-free"
        >
          {t('whyFree')}
        </button>
      </nav>

      <main className="app-main" data-testid="app-main">
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

      {/* Bug Report Button */}
      <button
        className="bug-report-btn"
        onClick={() => setShowBugReport(true)}
        data-testid="bug-report-btn"
      >
        <span>🐛</span>
        {t('reportBug')}
      </button>

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={showBugReport}
        onClose={() => setShowBugReport(false)}
        pageName={tabNames[currentTab]}
      />
    </div>
  );
}

/**
 * Main Application Component with Providers
 */
function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
