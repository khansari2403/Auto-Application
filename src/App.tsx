/**
 * Main App Component
 * Handles the main UI and navigation between different sections
 */

import { useState, useEffect } from 'react';
import './App.css';
import SettingsPanel from './components/SettingsPanel';
import ActionLog from './components/ActionLog';

function App() {
  const [userId, setUserId] = useState<number | null>(null);
  const [currentTab, setCurrentTab] = useState<'settings' | 'search' | 'applications' | 'logs'>('settings');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Initialize the application
   * Check if user profile exists, if not show setup screen
   */
  const initializeApp = async () => {
    try {
      // For now, we'll create a default user if none exists
      // In a real app, you'd check if a user profile exists first
      const result = await window.electron.createProfile({
        linkedinUrl: '',
        name: 'User',
        title: '',
        summary: '',
        photoPath: '',
      });

      if (result.success) {
        setUserId(result.id as number);
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app-container loading">
        <div className="loading-spinner">
          <p>Initializing Job Automation App...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="app-container error">
        <div className="error-message">
          <p>Failed to initialize application. Please restart.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1>🚀 Job Application Automation</h1>
          <p>Automate your job search and application process</p>
        </div>
      </header>

      {/* Navigation Tabs */}
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
          className={`nav-button ${currentTab === 'logs' ? 'active' : ''}`}
          onClick={() => setCurrentTab('logs')}
        >
          📊 Activity Log
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="app-main">
        {currentTab === 'settings' && <SettingsPanel userId={userId} />}
        {currentTab === 'search' && (
          <div className="content-section">
            <h2>Job Search</h2>
            <p>Job search functionality coming soon...</p>
          </div>
        )}
        {currentTab === 'applications' && (
          <div className="content-section">
            <h2>Applications</h2>
            <p>Applications management coming soon...</p>
          </div>
        )}
        {currentTab === 'logs' && <ActionLog userId={userId} />}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>Job Automation App v0.0.1 | All data stored locally on your computer</p>
      </footer>
    </div>
  );
}

export default App;
