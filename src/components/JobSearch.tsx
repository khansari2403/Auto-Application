import { useState, useEffect } from 'react';

export function JobSearch({ userId }: { userId: number }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [autoApply, setAutoApply] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [ghostHistory, setGhostHistory] = useState<any>(null);

  const loadData = async () => {
    const jobRes = await (window as any).electron.invoke('jobs:get-all', userId);
    if (jobRes?.success) setJobs(jobRes.data.sort((a: any, b: any) => b.id - a.id));
    const settings = await (window as any).electron.invoke('settings:get');
    if (settings?.success) setAutoApply(settings.data?.auto_apply === 1);
  };

  useEffect(() => { 
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleAddManual = async () => {
    if (!manualUrl) return;
    await (window as any).electron.invoke('jobs:add-manual', { url: manualUrl, userId });
    setManualUrl('');
    loadData();
    alert("Job link added! AI will now process this application.");
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '12px', marginBottom: '20px', borderLeft: '6px solid #ff9800' }}>
        <h4 style={{ margin: '0 0 5px 0' }}>👻 Ghost Job Detection</h4>
        <p style={{ fontSize: '12px', margin: 0 }}>Evaluation based on your search history. Ghost jobs are often used for HR training or investor optics. Central database coming soon.</p>
      </div>

      {/* MANUAL INPUT */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: '#f5f5f5', padding: '15px', borderRadius: '10px' }}>
        <input style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="Paste a Job URL here to apply manually..." />
        <button onClick={handleAddManual} style={{ padding: '10px 20px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>➕ Add Job Link</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <strong>AI Application Mode: {autoApply ? '🚀 Automatic' : '✋ Manual'}</strong>
        <button onClick={async () => { await (window as any).electron.invoke('settings:update', { id: 1, autoApply: autoApply ? 0 : 1 }); setAutoApply(!autoApply); }} style={{ padding: '8px 15px', background: autoApply ? '#f44336' : '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px' }}>
          {autoApply ? 'Switch to Manual' : 'Switch to Auto-Apply'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '15px' }}>
        {jobs.map(job => {
          const isGhost = job.seen_count > 1;
          return (
            <div key={job.id} style={{ padding: '15px', background: '#fff', border: isGhost ? '2px solid #ffcdd2' : '1px solid #eee', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <a href={job.url} target="_blank" style={{ fontSize: '16px', fontWeight: 'bold', color: '#0077b5', textDecoration: 'none' }}>{job.job_title}</a>
                    {isGhost && <span onClick={() => setGhostHistory(job)} style={{ fontSize: '20px', cursor: 'pointer' }} title="Click to see history">👻</span>}
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{job.company_name}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>📍 {job.location} | 🌐 Source: {job.sources?.[0] || 'Manual'} | 🔍 Profile: {job.profile_name || 'Manual'}</div>
                </div>
                {isGhost && <div style={{ color: '#d32f2f', fontSize: '11px', fontWeight: 'bold', textAlign: 'right' }}>⚠️ GHOST JOB METRIC: HIGH<br/>Rec: Do not waste time.</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* GHOST HISTORY POPUP */}
      {ghostHistory && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', maxWidth: '600px', width: '90%' }}>
            <button onClick={() => setGhostHistory(null)} style={{ float: 'right', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            <h3>👻 Ghost Job History: {ghostHistory.company_name}</h3>
            
            <div style={{ animation: 'flash 1s infinite', background: '#ffebee', padding: '15px', borderRadius: '8px', border: '2px solid #f44336', marginBottom: '20px', color: '#d32f2f', fontWeight: 'bold', textAlign: 'center' }}>
              📢 if you want call and ask the company's HR if this Job is a ghost Job, and ask for reason why this Job has been posted on these platform over that certain period...
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {ghostHistory.history?.map((h: any, i: number) => (
                <div key={i} style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '13px' }}>
                  <strong>Date:</strong> {new Date(h.date).toLocaleString()}<br/>
                  <strong>URL:</strong> <span style={{ color: '#0077b5', wordBreak: 'break-all' }}>{h.url}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes flash {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
