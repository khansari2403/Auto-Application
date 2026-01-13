/**
 * Company Monitoring Section
 * Monitor specific companies for new job postings
 */

import { useState, useEffect } from 'react';
import '../../styles/settings.css';

interface CompanyMonitoringSectionProps {
  userId: number;
}

function CompanyMonitoringSection({ userId }: CompanyMonitoringSectionProps) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    companyWebsite: '',
    careersPageUrl: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    loadCompanies();
  }, [userId]);

  const loadCompanies = async () => {
    try {
      const result = await window.electron.getCompanyMonitoring(userId);
      if (result.success) {
        setCompanies(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName || !formData.companyWebsite) {
      setMessage('Please fill in company name and website');
      setMessageType('error');
      return;
    }

    setIsLoading(true);

    try {
      const result = await window.electron.addCompanyMonitoring({
        userId,
        companyName: formData.companyName,
        companyWebsite: formData.companyWebsite,
        careersPageUrl: formData.careersPageUrl,
        checkFrequency: 'daily',
        isActive: true,
      });

      if (result.success) {
        setMessage('Company added to monitoring!');
        setMessageType('success');
        setFormData({ companyName: '', companyWebsite: '', careersPageUrl: '' });
        setShowForm(false);
        await loadCompanies();

        await window.electron.addActionLog({
          userId,
          actionType: 'company_monitoring_added',
          actionDescription: `Company monitoring added: ${formData.companyName}`,
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

  const handleDeleteCompany = async (companyId: number) => {
    if (!confirm('Stop monitoring this company?')) return;

    try {
      const result = await window.electron.deleteCompanyMonitoring(companyId);
      if (result.success) {
        setMessage('Company removed from monitoring!');
        setMessageType('success');
        await loadCompanies();
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    }
  };

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>👁️ Company Monitoring</h3>
        <p>Monitor specific companies for new job postings (checked daily)</p>
      </div>

      {message && (
        <div className={`message message-${messageType}`}>
          {messageType === 'success' && '✓ '}
          {messageType === 'error' && '✗ '}
          {message}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAddCompany} className="settings-form">
          <div className="form-group">
            <label htmlFor="company-name">Company Name *</label>
            <input
              id="company-name"
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="e.g., Google, Microsoft"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="company-website">Company Website *</label>
            <input
              id="company-website"
              type="url"
              value={formData.companyWebsite}
              onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
              placeholder="https://company.com"
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="careers-page">Careers Page URL</label>
            <input
              id="careers-page"
              type="url"
              value={formData.careersPageUrl}
              onChange={(e) => setFormData({ ...formData, careersPageUrl: e.target.value })}
              placeholder="https://company.com/careers"
              className="form-input"
              disabled={isLoading}
            />
            <small>If not provided, the app will try to find it automatically</small>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Company'}
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
          + Add Company to Monitor
        </button>
      )}

      <div className="companies-list">
        {companies.length === 0 ? (
          <p className="empty-state">No companies being monitored. Add one to get started!</p>
        ) : (
          companies.map((company) => (
            <div key={company.id} className="company-card">
              <div className="company-info">
                <h4>{company.company_name}</h4>
                <p>Website: {company.company_website}</p>
                {company.careers_page_url && <p>Careers: {company.careers_page_url}</p>}
                <p>Check Frequency: {company.check_frequency}</p>
                {company.last_checked && (
                  <p>Last Checked: {new Date(company.last_checked).toLocaleString()}</p>
                )}
                <p className={`status ${company.is_active ? 'active' : 'inactive'}`}>
                  {company.is_active ? '✓ Active' : '✗ Inactive'}
                </p>
              </div>
              <button
                className="btn btn-danger btn-small"
                onClick={() => handleDeleteCompany(company.id)}
              >
                Stop Monitoring
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CompanyMonitoringSection;
