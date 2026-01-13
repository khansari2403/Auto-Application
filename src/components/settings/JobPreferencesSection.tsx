/**
 * Job Preferences Section
 * Configure all job search preferences and filters
 */

import { useState, useEffect } from 'react';
import '../../styles/settings.css';

interface JobPreferencesSectionProps {
  userId: number;
}

function JobPreferencesSection({ userId }: JobPreferencesSectionProps) {
  const [preferences, setPreferences] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const result = await window.electron.getPreferences(userId);
      if (result.success && result.data) {
        setPreferences(result.data);
      } else {
        setPreferences({});
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await window.electron.savePreferences({
        userId,
        ...preferences,
      });

      if (result.success) {
        setMessage('Job preferences saved successfully!');
        setMessageType('success');

        await window.electron.addActionLog({
          userId,
          actionType: 'preferences_saved',
          actionDescription: 'Job preferences updated',
          status: 'completed',
          success: true,
        });
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!preferences) {
    return <div className="settings-section"><p>Loading preferences...</p></div>;
  }

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>🎯 Job Preferences</h3>
        <p>Configure your job search criteria and preferences</p>
      </div>

      {message && (
        <div className={`message message-${messageType}`}>
          {messageType === 'success' && '✓ '}
          {messageType === 'error' && '✗ '}
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="settings-form preferences-form">
        <div className="preferences-grid">
          {/* Basic Preferences */}
          <div className="form-group">
            <label>Job Title/Keywords</label>
            <input
              type="text"
              value={preferences.job_title || ''}
              onChange={(e) => setPreferences({ ...preferences, job_title: e.target.value })}
              placeholder="e.g., Software Engineer, Data Scientist"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              value={preferences.location || ''}
              onChange={(e) => setPreferences({ ...preferences, location: e.target.value })}
              placeholder="e.g., Berlin, Germany"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Remote Type</label>
            <select
              value={preferences.remote_type || ''}
              onChange={(e) => setPreferences({ ...preferences, remote_type: e.target.value })}
              className="form-input"
              disabled={isLoading}
            >
              <option value="">Any</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>

          <div className="form-group">
            <label>Salary Range (Min)</label>
            <input
              type="number"
              value={preferences.salary_min || ''}
              onChange={(e) => setPreferences({ ...preferences, salary_min: parseInt(e.target.value) || null })}
              placeholder="Minimum salary"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Salary Range (Max)</label>
            <input
              type="number"
              value={preferences.salary_max || ''}
              onChange={(e) => setPreferences({ ...preferences, salary_max: parseInt(e.target.value) || null })}
              placeholder="Maximum salary"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Experience Level</label>
            <select
              value={preferences.experience_level || ''}
              onChange={(e) => setPreferences({ ...preferences, experience_level: e.target.value })}
              className="form-input"
              disabled={isLoading}
            >
              <option value="">Any</option>
              <option value="entry">Entry Level</option>
              <option value="mid">Mid Level</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead/Manager</option>
            </select>
          </div>

          <div className="form-group">
            <label>Industry/Sector</label>
            <input
              type="text"
              value={preferences.industry || ''}
              onChange={(e) => setPreferences({ ...preferences, industry: e.target.value })}
              placeholder="e.g., Technology, Finance"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Contract Type</label>
            <select
              value={preferences.contract_type || ''}
              onChange={(e) => setPreferences({ ...preferences, contract_type: e.target.value })}
              className="form-input"
              disabled={isLoading}
            >
              <option value="">Any</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="freelance">Freelance</option>
            </select>
          </div>

          <div className="form-group">
            <label>Company Size</label>
            <select
              value={preferences.company_size || ''}
              onChange={(e) => setPreferences({ ...preferences, company_size: e.target.value })}
              className="form-input"
              disabled={isLoading}
            >
              <option value="">Any</option>
              <option value="startup">Startup</option>
              <option value="small">Small (1-50)</option>
              <option value="medium">Medium (50-500)</option>
              <option value="large">Large (500+)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Languages Required</label>
            <input
              type="text"
              value={preferences.languages || ''}
              onChange={(e) => setPreferences({ ...preferences, languages: e.target.value })}
              placeholder="e.g., English, German"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Required Skills</label>
            <input
              type="text"
              value={preferences.required_skills || ''}
              onChange={(e) => setPreferences({ ...preferences, required_skills: e.target.value })}
              placeholder="e.g., Python, React, AWS"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>Exclude Keywords</label>
            <input
              type="text"
              value={preferences.exclude_keywords || ''}
              onChange={(e) => setPreferences({ ...preferences, exclude_keywords: e.target.value })}
              placeholder="e.g., Sales, Support"
              className="form-input"
              disabled={isLoading}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Preferences'}
        </button>
      </form>

      <div className="section-info">
        <p>💡 All fields are optional. Leave blank to match any value for that criterion.</p>
      </div>
    </div>
  );
}

export default JobPreferencesSection;
