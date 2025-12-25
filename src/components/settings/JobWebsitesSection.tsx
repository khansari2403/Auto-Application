/**
 * Job Websites Section
 * Manage job search websites (LinkedIn, Indeed, Glassdoor, Xing, custom)
 */

import { useState, useEffect } from 'react';
import '../../styles/settings.css';

interface JobWebsitesSectionProps {
  userId: number;
}

const DEFAULT_WEBSITES = [
  { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs' },
  { name: 'Indeed', url: 'https://www.indeed.com' },
  { name: 'Glassdoor', url: 'https://www.glassdoor.com/Job' },
  { name: 'Xing', url: 'https://www.xing.com/jobs' },
];

function JobWebsitesSection({ userId }: JobWebsitesSectionProps) {
  const [websites, setWebsites] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ websiteName: '', websiteUrl: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    loadWebsites();
  }, [userId]);

  const loadWebsites = async () => {
    try {
      const result = await window.electron.getWebsites(userId);
      if (result.success) {
        setWebsites(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load websites:', error);
    }
  };

  const handleAddWebsite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.websiteName || !formData.websiteUrl) {
      setMessage('Please fill in all fields');
      setMessageType('error');
      return;
    }

    setIsLoading(true);

    try {
      const result = await window.electron.addWebsite({
        userId,
        websiteName: formData.websiteName,
        websiteUrl: formData.websiteUrl,
        isActive: true,
      });

      if (result.success) {
        setMessage('Website added successfully!');
        setMessageType('success');
        setFormData({ websiteName: '', websiteUrl: '' });
        setShowForm(false);
        await loadWebsites();

        await window.electron.addActionLog({
          userId,
          actionType: 'website_added',
          actionDescription: `Job website added: ${formData.websiteName}`,
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

  const handleDeleteWebsite = async (websiteId: number) => {
    if (!confirm('Delete this website?')) return;

    try {
      const result = await window.electron.deleteWebsite(websiteId);
      if (result.success) {
        setMessage('Website deleted!');
        setMessageType('success');
        await loadWebsites();
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    }
  };

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>🌐 Job Websites</h3>
        <p>Configure job search websites for automated searching</p>
      </div>

      {message && (
        <div className={`message message-${messageType}`}>
          {messageType === 'success' && '✓ '}
          {messageType === 'error' && '✗ '}
          {message}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAddWebsite} className="settings-form">
          <div className="form-group">
            <label htmlFor="website-name">Website Name *</label>
            <input
              id="website-name"
              type="text"
              value={formData.websiteName}
              onChange={(e) => setFormData({ ...formData, websiteName: e.target.value })}
              placeholder="e.g., LinkedIn, Indeed"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="website-url">Website URL *</label>
            <input
              id="website-url"
              type="url"
              value={formData.websiteUrl}
              onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
              placeholder="https://example.com"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Website'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowForm(false)}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!showForm && (
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Add Custom Website
        </button>
      )}

      <div className="websites-list">
        {websites.length === 0 ? (
          <p className="empty-state">No websites configured. Add one to get started!</p>
        ) : (
          websites.map((website) => (
            <div key={website.id} className="website-card">
              <div className="website-info">
                <h4>{website.website_name}</h4>
                <p>{website.website_url}</p>
                <p className={`status ${website.is_active ? 'active' : 'inactive'}`}>
                  {website.is_active ? '✓ Active' : '✗ Inactive'}
                </p>
              </div>
              <button
                className="btn btn-danger btn-small"
                onClick={() => handleDeleteWebsite(website.id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default JobWebsitesSection;
