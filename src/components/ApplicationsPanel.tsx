import { useState, useEffect } from 'react';

function ApplicationsPanel({ userId }: { userId: number }) {
  const [apps, setApps] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newApp, setNewApp] = useState({ jobTitle: '', companyName: '' });

  useEffect(() => { loadApps(); }, [userId]);

  const loadApps = async () => {
    const result = await (window as any).electron.getApps(userId);
    if (result?.success) setApps(result.data);
  };

  const handleAdd = async () => {
    if (!newApp.jobTitle || !newApp.companyName) {
      alert('Please fill in both fields');
      return;
    }
    await (window as any).electron.saveApp({ ...newApp, userId });
    setNewApp({ jobTitle: '', companyName: '' });
    setShowAdd(false);
    loadApps(); // Refresh the list
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📋 My Applications</h2>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          {showAdd ? 'Cancel' : '+ Add Application'}
        </button>
      </div>

      {showAdd && (
        <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
          <input placeholder="Job Title (e.g. Designer)" value={newApp.jobTitle} onChange={e => setNewApp({...newApp, jobTitle: e.target.value})} style={{ marginRight: '10px', padding: '8px' }} />
          <input placeholder="Company (e.g. Apple)" value={newApp.companyName} onChange={e => setNewApp({...newApp, companyName: e.target.value})} style={{ marginRight: '10px', padding: '8px' }} />
          <button onClick={handleAdd} style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}>Save</button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <thead style={{ background: '#f4f4f4' }}>
          <tr style={{ textAlign: 'left' }}>
            <th style={{ padding: '12px' }}>Job Title</th>
            <th style={{ padding: '12px' }}>Company</th>
            <th style={{ padding: '12px' }}>Status</th>
            <th style={{ padding: '12px' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {apps.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No applications yet. Add one to start tracking!</td></tr>
          ) : (
            apps.map(app => (
              <tr key={app.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{app.job_title}</td>
                <td style={{ padding: '12px' }}>{app.company_name}</td>
                <td style={{ padding: '12px' }}><span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{app.status}</span></td>
                <td style={{ padding: '12px' }}>{new Date(app.applied_date).toLocaleDateString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ApplicationsPanel;