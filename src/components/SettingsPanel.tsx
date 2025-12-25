/**
 * Settings Panel Component
 * Handles all configuration: LinkedIn, AI Models, Email, Job Websites, Company Monitoring
 */

import { useState, useEffect } from 'react';
import '../styles/SettingsPanel.css';
import LinkedInSection from './settings/LinkedInSection';
import AIModelsSection from './settings/AIModelsSection';
import EmailConfigSection from './settings/EmailConfigSection';
import JobWebsitesSection from './settings/JobWebsitesSection';
import JobPreferencesSection from './settings/JobPreferencesSection';
import CompanyMonitoringSection from './settings/CompanyMonitoringSection';

interface SettingsPanelProps {
  userId: number;
}

/**
 * Main settings panel component
 * Organizes all configuration sections in tabs
 */
function SettingsPanel({ userId }: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<
    'linkedin' | 'preferences' | 'ai-models' | 'email' | 'websites' | 'monitoring'
  >('linkedin');
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Configuration & Settings</h2>
        <p>Set up your profile, preferences, and integrations</p>
      </div>

      {/* Settings Navigation */}
      <div className="settings-nav">
        <button
          className={`settings-nav-button ${activeSection === 'linkedin' ? 'active' : ''}`}
          onClick={() => setActiveSection('linkedin')}
        >
          👤 LinkedIn Profile
        </button>
        <button
          className={`settings-nav-button ${activeSection === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveSection('preferences')}
        >
          🎯 Job Preferences
        </button>
        <button
          className={`settings-nav-button ${activeSection === 'ai-models' ? 'active' : ''}`}
          onClick={() => setActiveSection('ai-models')}
        >
          🤖 AI Models
        </button>
        <button
          className={`settings-nav-button ${activeSection === 'email' ? 'active' : ''}`}
          onClick={() => setActiveSection('email')}
        >
          📧 Email Configuration
        </button>
        <button
          className={`settings-nav-button ${activeSection === 'websites' ? 'active' : ''}`}
          onClick={() => setActiveSection('websites')}
        >
          🌐 Job Websites
        </button>
        <button
          className={`settings-nav-button ${activeSection === 'monitoring' ? 'active' : ''}`}
          onClick={() => setActiveSection('monitoring')}
        >
          👁️ Company Monitoring
        </button>
      </div>

      {/* Settings Content */}
      <div className="settings-content">
        {activeSection === 'linkedin' && <LinkedInSection userId={userId} />}
        {activeSection === 'preferences' && <JobPreferencesSection userId={userId} />}
        {activeSection === 'ai-models' && <AIModelsSection userId={userId} />}
        {activeSection === 'email' && <EmailConfigSection userId={userId} />}
        {activeSection === 'websites' && <JobWebsitesSection userId={userId} />}
        {activeSection === 'monitoring' && <CompanyMonitoringSection userId={userId} />}
      </div>
    </div>
  );
}

export default SettingsPanel;
