import { useState, useEffect } from 'react';
import '../../styles/settings.css';

interface JobWebsitesSectionProps {
  userId: number;
}

function JobWebsitesSection({ userId }: JobWebsitesSectionProps) {
  const [websites, setWebsites] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    websiteName: '', 
    websiteUrl: '', 
    email: '', 
    password: '', 
    siteType: 'job_board', 
    checkFrequency: 4 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    loadWebsites();
  }, [userId]);

  const loadWebsites = async () => {
    try {
      const result = await (window as any).electron.invoke('websites:get-all', userId);
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
      setMessage('Please fill in required fields');
      setMessageType('error');
      return;
    }
    setIsLoading(true);
    try {
      const result = await (window as any).electron.invoke('websites:add', {
        userId,
        ...formData,
        isActive: 1,
      });
      if (result.id) {
        setMessage('Website added successfully!');
        setMessageType('success');
        setFormData({ websiteName: '', websiteUrl: '', email: '', password: '', siteType: 'job_board', checkFrequency: 4 });
        setShowForm(false);
        await loadWebsites();
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: number) => {
    try {
      await (window as any).electron.invoke('websites:toggle-active', { id, isActive: currentStatus === 1 ? 0 : 1 });
      await loadWebsites();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const handleDeleteWebsite = async (websiteId: number) => {
    if (!confirm('Delete this website?')) return;
    try {
      await (window as any).electron.invoke('websites:delete', websiteId);
      setMessage('Website deleted!');
      setMessageType('success');
      await loadWebsites();
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    }
  };

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>🌐 Job Websites & Career Pages</h3>
        <p>Manage search sources, credentials, and monitoring frequency</p>
      </div>
      {message && <div className={`message message-${messageType}`}>{message}</div>}
      
      {showForm && (
        <form onSubmit={handleAddWebsite} className="settings-form">
          <div className="form-row">
            <div className="form-group">
              <label>Website Name *</label>
              <input type="text" value={formData.websiteName} onChange={(e) => setFormData({ ...formData, websiteName: e.target.value })} placeholder="e.g., LinkedIn" className="form-input" />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={formData.siteType} onChange={(e) => setFormData({ ...formData, siteType: e.target.value })} className="form-input">
                <option value="job_board">Job Board (LinkedIn/Indeed)</option>
                <option value="career_page">Company Career Page</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Website URL *</label>
            <input type="url" value={formData.websiteUrl} onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })} placeholder="https://example.com" className="form-input" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Login Email (Optional)</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" className="form-input" />
            </div>
            <div className="form-group">
              <label>Login Password (Optional)</label>
              <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" className="form-input" />
            </div>
          </div>

          <div className="form-group">
            <label>Check Frequency (Hours)</label>
            <input type="number" value={formData.checkFrequency} onChange={(e) => setFormData({ ...formData, checkFrequency: parseInt(e.target.value) })} min="1" max="168" className="form-input" />
            <small>Career pages are checked once every 24h by default.</small>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? 'Adding...' : 'Add Website'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {!showForm && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add New Source</button>}

      <div className="websites-list">
        {websites.map((website) => (
          <div key={website.id} className={`website-card ${website.is_active ? '' : 'disabled'}`}>
            <div className="website-info">
              <h4>{website.website_name} <span className="badge">{website.site_type === 'career_page' ? '🏢 Career Page' : '📋 Job Board'}</span></h4>
              <p>{website.website_url}</p>
              <p className="meta">Check every {website.check_frequency}h | Last checked: {website.last_checked ? new Date(website.last_checked).toLocaleString() : 'Never'}</p>
            </div>
            <div className="website-actions">
              <button className={`btn btn-small ${website.is_active ? 'btn-secondary' : 'btn-success'}`} onClick={() => handleToggleActive(website.id, website.is_active)}>
                {website.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button className="btn btn-danger btn-small" onClick={() => handleDeleteWebsite(website.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default JobWebsitesSection;