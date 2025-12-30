import { useState } from 'react';
import LinkedInSection from './settings/LinkedInSection';
import AIModelsSection from './settings/AIModelsSection';
import EmailMonitoringSection from './settings/EmailMonitoringSection';
import { StorageSettings } from './settings/StorageSettings';
import '../styles/SettingsPanel.css';

/**
 * Settings Panel Component
 * Manages core application configurations.
 * Redundant "Job Websites" and "Monitoring" tabs have been removed 
 * as they are now part of the main navigation.
 */
function SettingsPanel({ userId }: { userId: number }) {
  const [activeSection, setActiveSection] = useState('linkedin');

  return (
    <div className="settings-panel">
      <nav className="settings-nav">
        <button 
          className={activeSection === 'linkedin' ? 'active' : ''} 
          onClick={() => setActiveSection('linkedin')}
        >
          👤 LinkedIn
        </button>
        <button 
          className={activeSection === 'ai' ? 'active' : ''} 
          onClick={() => setActiveSection('ai')}
        >
          🤖 AI Team
        </button>
        <button 
          className={activeSection === 'storage' ? 'active' : ''} 
          onClick={() => setActiveSection('storage')}
        >
          💾 Storage
        </button>
        <button 
          className={activeSection === 'email' ? 'active' : ''} 
          onClick={() => setActiveSection('email')}
        >
          📧 Email Setup
        </button>
      </nav>

      <div className="settings-content">
        {activeSection === 'linkedin' && <LinkedInSection userId={userId} />}
        {activeSection === 'ai' && <AIModelsSection userId={userId} />}
        {activeSection === 'storage' && <StorageSettings userId={userId} />}
        {activeSection === 'email' && <EmailMonitoringSection userId={userId} />}
      </div>
    </div>
  );
}

export default SettingsPanel;