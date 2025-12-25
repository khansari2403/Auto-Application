/**
 * LinkedIn Section Component
 * Handles LinkedIn profile URL input and profile data management
 */

import { useState, useEffect } from 'react';
import '../../styles/settings.css';

interface LinkedInSectionProps {
  userId: number;
}

/**
 * LinkedIn profile configuration section
 * User provides LinkedIn profile URL for scraping
 */
function LinkedInSection({ userId }: LinkedInSectionProps) {
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  // Load existing profile on mount
  useEffect(() => {
    loadProfile();
  }, [userId]);

  /**
   * Load existing profile from database
   */
  const loadProfile = async () => {
    try {
      const result = await window.electron.getProfile(userId);
      if (result.success && result.data) {
        setProfileData(result.data);
        setLinkedinUrl(result.data.linkedin_url || '');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  /**
   * Handle LinkedIn URL submission
   * In a real app, this would scrape the LinkedIn profile
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!linkedinUrl.trim()) {
      setMessage('Please enter a LinkedIn profile URL');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Validate URL format
      if (!linkedinUrl.includes('linkedin.com/in/')) {
        throw new Error('Invalid LinkedIn URL. Please use format: https://linkedin.com/in/username');
      }

      // Update profile with LinkedIn URL
      const result = await window.electron.updateProfile({
        id: userId,
        name: profileData?.name || 'User',
        title: profileData?.title || '',
        summary: profileData?.summary || '',
        photoPath: profileData?.photo_path || '',
      });

      if (result.success) {
        setMessage('LinkedIn profile URL saved successfully!');
        setMessageType('success');
        
        // Log action
        await window.electron.addActionLog({
          userId,
          actionType: 'linkedin_url_saved',
          actionDescription: `LinkedIn profile URL saved: ${linkedinUrl}`,
          status: 'completed',
          success: true,
        });
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
      
      // Log error
      await window.electron.addActionLog({
        userId,
        actionType: 'linkedin_url_error',
        actionDescription: `Failed to save LinkedIn URL`,
        status: 'completed',
        success: false,
        errorMessage: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>👤 LinkedIn Profile</h3>
        <p>Enter your LinkedIn profile URL for the app to learn about your experience and skills</p>
      </div>

      <form onSubmit={handleSubmit} className="settings-form">
        <div className="form-group">
          <label htmlFor="linkedin-url">
            LinkedIn Profile URL
            <span className="help-icon" title="Your LinkedIn profile URL (e.g., https://linkedin.com/in/yourname)">ℹ️</span>
          </label>
          <input
            id="linkedin-url"
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/yourname"
            className="form-input"
            disabled={isLoading}
          />
          <small>The app will use this URL to extract your profile information</small>
        </div>

        {message && (
          <div className={`message message-${messageType}`}>
            {messageType === 'success' && '✓ '}
            {messageType === 'error' && '✗ '}
            {messageType === 'info' && 'ℹ️ '}
            {message}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save LinkedIn Profile'}
        </button>
      </form>

      {profileData && (
        <div className="profile-info">
          <h4>Current Profile Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <label>Name:</label>
              <span>{profileData.name || 'Not set'}</span>
            </div>
            <div className="info-item">
              <label>Title:</label>
              <span>{profileData.title || 'Not set'}</span>
            </div>
            <div className="info-item">
              <label>LinkedIn URL:</label>
              <span>{profileData.linkedin_url || 'Not set'}</span>
            </div>
            <div className="info-item">
              <label>Last Updated:</label>
              <span>{profileData.updated_at ? new Date(profileData.updated_at).toLocaleDateString() : 'Never'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="section-info">
        <h4>How it works:</h4>
        <ol>
          <li>Enter your LinkedIn profile URL</li>
          <li>The app will extract your profile information (name, title, experience, skills, education)</li>
          <li>This information is used to create tailored CVs and motivation letters</li>
          <li>All data is stored locally on your computer</li>
        </ol>
      </div>
    </div>
  );
}

export default LinkedInSection;
