import { useState, useEffect } from 'react';

interface JobWebsitesSectionProps {
  userId: number;
}

function JobWebsitesSection({ userId }: JobWebsitesSectionProps) {
  const [websites, setWebsites] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
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
    const i = setInterval(loadWebsites, 5000);
    return () => clearInterval(i);
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

  const resetForm = () => {
    setFormData({ websiteName: '', websiteUrl: '', email: '', password: '', siteType: 'job_board', checkFrequency: 4 });
    setEditingId(null);
    setShowForm(false);
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
        website_name: formData.websiteName,
        website_url: formData.websiteUrl,
        email: formData.email,
        password: formData.password,
        site_type: formData.siteType,
        check_frequency: formData.checkFrequency,
        is_active: 1,
      });
      if (result.success || result.id) {
        setMessage('Website added successfully!');
        setMessageType('success');
        resetForm();
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
    if (!confirm('Are you sure you want to delete this website?')) return;
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

  const handleEditWebsite = (website: any) => {
    setFormData({
      websiteName: website.website_name || '',
      websiteUrl: website.website_url || '',
      email: website.email || '',
      password: '',
      siteType: website.site_type || 'job_board',
      checkFrequency: website.check_frequency || 4
    });
    setEditingId(website.id);
    setShowForm(true);
  };

  const inputStyle: React.CSSProperties = { 
    width: '100%', 
    padding: '10px 12px', 
    borderRadius: '8px', 
    border: '1px solid var(--border)', 
    background: 'var(--input-bg)', 
    color: 'var(--text-primary)',
    fontSize: '14px'
  };

  const labelStyle: React.CSSProperties = { 
    display: 'block', 
    marginBottom: '6px', 
    fontSize: '13px', 
    fontWeight: 600, 
    color: 'var(--text-primary)' 
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', background: 'var(--bg-primary)', minHeight: '100%' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '24px' }}>
          🌐 Job Websites & Career Pages
        </h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
          Manage search sources, credentials, and monitoring frequency
        </p>
      </div>

      {message && (
        <div style={{ 
          padding: '12px 16px', 
          marginBottom: '20px', 
          borderRadius: '8px',
          background: messageType === 'success' ? 'var(--success-light)' : messageType === 'error' ? 'var(--danger-light)' : 'var(--info-light)',
          color: messageType === 'success' ? 'var(--success)' : messageType === 'error' ? 'var(--danger)' : 'var(--info)',
          fontSize: '13px'
        }}>
          {message}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ 
          background: 'var(--card-bg)', 
          padding: '24px', 
          borderRadius: '12px', 
          marginBottom: '24px',
          border: '1px solid var(--border)'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)', fontSize: '18px' }}>
            {editingId ? '✏️ Edit Website' : '➕ Add New Website'}
          </h3>
          <form onSubmit={handleAddWebsite}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Website Name *</label>
                <input 
                  type="text" 
                  value={formData.websiteName} 
                  onChange={(e) => setFormData({ ...formData, websiteName: e.target.value })} 
                  placeholder="e.g., LinkedIn, Indeed" 
                  style={inputStyle} 
                />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select 
                  value={formData.siteType} 
                  onChange={(e) => setFormData({ ...formData, siteType: e.target.value })} 
                  style={inputStyle}
                >
                  <option value="job_board">Job Board (LinkedIn/Indeed)</option>
                  <option value="career_page">Company Career Page</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Website URL *</label>
              <input 
                type="url" 
                value={formData.websiteUrl} 
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })} 
                placeholder="https://www.linkedin.com/jobs" 
                style={inputStyle} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Login Email (Optional)</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  placeholder="email@example.com" 
                  style={inputStyle} 
                />
              </div>
              <div>
                <label style={labelStyle}>Password (Optional)</label>
                <input 
                  type="password" 
                  value={formData.password} 
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                  placeholder="••••••••" 
                  style={inputStyle} 
                />
              </div>
              <div>
                <label style={labelStyle}>Check Frequency (Hours)</label>
                <input 
                  type="number" 
                  value={formData.checkFrequency} 
                  onChange={(e) => setFormData({ ...formData, checkFrequency: parseInt(e.target.value) })} 
                  min="1" 
                  max="168" 
                  style={inputStyle} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="submit" 
                disabled={isLoading}
                style={{ 
                  padding: '10px 24px', 
                  background: '#0077b5', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  fontSize: '14px',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading ? 'Saving...' : editingId ? 'Update Website' : 'Add Website'}
              </button>
              <button 
                type="button" 
                onClick={resetForm}
                style={{ 
                  padding: '10px 24px', 
                  background: 'var(--bg-tertiary)', 
                  color: 'var(--text-primary)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Button */}
      {!showForm && (
        <button 
          onClick={() => setShowForm(true)}
          style={{ 
            padding: '12px 24px', 
            background: '#0077b5', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            fontSize: '14px',
            marginBottom: '24px'
          }}
        >
          + Add New Website
        </button>
      )}

      {/* Websites List */}
      <div style={{ 
        background: 'var(--card-bg)', 
        borderRadius: '12px', 
        border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr 120px 200px', 
          gap: '16px',
          padding: '16px 20px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          fontWeight: 600,
          fontSize: '13px',
          color: 'var(--text-secondary)'
        }}>
          <span>Website</span>
          <span>Type</span>
          <span>Status</span>
          <span style={{ textAlign: 'center' }}>Actions</span>
        </div>

        {/* List Items */}
        {websites.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            No websites configured yet. Click "Add New Website" to get started.
          </div>
        ) : (
          websites.map((website) => (
            <div 
              key={website.id} 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1fr 120px 200px', 
                gap: '16px',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                alignItems: 'center',
                opacity: website.is_active ? 1 : 0.6,
                background: website.is_active ? 'transparent' : 'var(--bg-tertiary)'
              }}
            >
              {/* Website Info */}
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {website.website_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>
                  {website.website_url}
                </div>
              </div>

              {/* Type Badge */}
              <div>
                <span style={{ 
                  display: 'inline-block',
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '11px', 
                  fontWeight: 500,
                  background: website.site_type === 'career_page' ? 'var(--warning-light)' : 'var(--info-light)',
                  color: website.site_type === 'career_page' ? 'var(--warning)' : 'var(--info)'
                }}>
                  {website.site_type === 'career_page' ? '🏢 Career Page' : '📋 Job Board'}
                </span>
              </div>

              {/* Status */}
              <div>
                <span style={{ 
                  display: 'inline-block',
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '11px', 
                  fontWeight: 600,
                  background: website.is_active ? 'var(--success-light)' : 'var(--danger-light)',
                  color: website.is_active ? 'var(--success)' : 'var(--danger)'
                }}>
                  {website.is_active ? '✓ Active' : '✗ Inactive'}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button 
                  onClick={() => handleToggleActive(website.id, website.is_active)}
                  title={website.is_active ? 'Deactivate' : 'Activate'}
                  style={{ 
                    padding: '8px 14px', 
                    borderRadius: '6px', 
                    border: 'none',
                    background: website.is_active ? 'var(--warning-light)' : 'var(--success-light)', 
                    color: website.is_active ? 'var(--warning)' : 'var(--success)',
                    cursor: 'pointer', 
                    fontSize: '12px',
                    fontWeight: 500
                  }}
                >
                  {website.is_active ? '⏸ Pause' : '▶ Start'}
                </button>
                <button 
                  onClick={() => handleEditWebsite(website)}
                  title="Edit"
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg)', 
                    color: 'var(--text-primary)',
                    cursor: 'pointer', 
                    fontSize: '12px'
                  }}
                >
                  ✏️
                </button>
                <button 
                  onClick={() => handleDeleteWebsite(website.id)}
                  title="Delete"
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--danger-light)',
                    background: 'var(--card-bg)', 
                    color: 'var(--danger)',
                    cursor: 'pointer', 
                    fontSize: '12px'
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default JobWebsitesSection;