import { useState, useEffect } from 'react';
import '../../styles/settings.css';

interface JobWebsitesSectionProps {
  userId: number;
}

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
      setMessage('Please fill in all fields');
      setMessageType('error');
      return;
    }
    setIsLoading(true);
    try {
      const result = await (window as any).electron.invoke('websites:add', {
        userId,
        websiteName: formData.websiteName,
        websiteUrl: formData.websiteUrl,
        isActive: 1,
      });
      if (result.id) {
        setMessage('Website added successfully!');
        setMessageType('success');
        setFormData({ websiteName: '', websiteUrl: '' });
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
        <h3>🌐 Job Websites</h3>
        <p>Configure job search websites for automated searching</p>
      </div>
      {message && <div className={`message message-${messageType}`}>{message}</div>}
      {showForm && (
        <form onSubmit={handleAddWebsite} className="settings-form">
          <div className="form-group">
            <label>Website Name *</label>
            <input type="text" value={formData.websiteName} onChange={(e) => setFormData({ ...formData, websiteName: e.target.value })} placeholder="e.g., LinkedIn, Indeed" className="form-input" />
          </div>
          <div className="form-group">
            <label>Website URL *</label>
            <input type="url" value={formData.websiteUrl} onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })} placeholder="https://example.com" className="form-input" />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? 'Adding...' : 'Add Website'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}
      {!showForm && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Custom Website</button>}
      <div className="websites-list">
        {websites.map((website) => (
          <div key={website.id} className="website-card">
            <div className="website-info">
              <h4>{website.website_name}</h4>
              <p>{website.website_url}</p>
              <p className={`status ${website.is_active ? 'active' : 'inactive'}`}>{website.is_active ? '✓ Active' : '✗ Inactive'}</p>
            </div>
            <button className="btn btn-danger btn-small" onClick={() => handleDeleteWebsite(website.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default JobWebsitesSection;