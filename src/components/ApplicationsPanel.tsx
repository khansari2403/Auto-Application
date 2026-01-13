import { useState, useEffect } from 'react';

function ApplicationsPanel({ userId }: { userId: number }) {
  const [apps, setApps] = useState<any[]>([]);

  const loadApps = async () => {
    const result = await (window as any).electron.invoke('apps:get-all', userId);
    if (result?.success) setApps(result.data);
  };

  useEffect(() => { loadApps(); }, [userId]);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>📋 My Applications</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <thead style={{ background: '#f4f4f4' }}>
          <tr style={{ textAlign: 'left' }}>
            <th style={{ padding: '15px' }}>#</th>
            <th style={{ padding: '15px' }}>Job Title</th>
            <th style={{ padding: '15px' }}>Company</th>
            <th style={{ padding: '15px' }}>Status</th>
            <th style={{ padding: '15px' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((app, index) => (
            <tr key={app.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '15px', fontWeight: 'bold', color: '#999' }}>{index + 1}</td>
              <td style={{ padding: '15px', fontWeight: 'bold' }}>{app.job_title}</td>
              <td style={{ padding: '15px' }}>{app.company_name}</td>
              <td style={{ padding: '15px' }}>
                <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                  {app.status.toUpperCase()}
                </span>
              </td>
              <td style={{ padding: '15px', color: '#666' }}>{new Date(app.applied_date).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ApplicationsPanel;