import { useState } from 'react';
import LinkedInSection from './settings/LinkedInSection';
import AIModelsSection from './settings/AIModelsSection';
import EmailConfigSection from './settings/EmailConfigSection';
import JobWebsitesSection from './settings/JobWebsitesSection';
import CompanyMonitoringSection from './settings/CompanyMonitoringSection';
import '../styles/SettingsPanel.css';

function SettingsPanel({ userId }: { userId: number }) {
  const [activeSection, setActiveSection] = useState('linkedin');

  return (
    <div className="settings-panel">
      <nav className="settings-nav">
        <button className={activeSection === 'linkedin' ? 'active' : ''} onClick={() => setActiveSection('linkedin')}>👤 LinkedIn</button>
        <button className={activeSection === 'ai' ? 'active' : ''} onClick={() => setActiveSection('ai')}>🤖 AI Models</button>
        <button className={activeSection === 'email' ? 'active' : ''} onClick={() => setActiveSection('email')}>📧 Email Config</button>
        <button className={activeSection === 'websites' ? 'active' : ''} onClick={() => setActiveSection('websites')}>🌐 Job Websites</button>
        <button className={activeSection === 'monitoring' ? 'active' : ''} onClick={() => setActiveSection('monitoring')}>👁️ Monitoring</button>
      </nav>
      <div className="settings-content">
        {activeSection === 'linkedin' && <LinkedInSection userId={userId} />}
        {activeSection === 'ai' && <AIModelsSection userId={userId} />}
        {activeSection === 'email' && <EmailConfigSection userId={userId} />}
        {activeSection === 'websites' && <JobWebsitesSection userId={userId} />}
        {activeSection === 'monitoring' && <CompanyMonitoringSection userId={userId} />}
      </div>
    </div>
  );
}

export default SettingsPanel;