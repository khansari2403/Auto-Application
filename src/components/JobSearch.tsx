import { useState, useEffect } from 'react';

export function JobSearch({ userId }: { userId: number }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [autoApply, setAutoApply] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

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

  const handleApply = async (jobId: number) => {
    setProcessingId(jobId);
    const result = await (window as any).electron.invoke('ai:process-application', jobId, userId);
    setProcessingId(null);
    if (result.success) {
      alert(`Success! Your tailored CV and Letter have been saved to your hard drive.`);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '12px', marginBottom: '20px', borderLeft: '6px solid #ff9800' }}>
        <h4 style={{ margin: '0 0 5px 0' }}>👻 Ghost Job Detection Active</h4>
        <p style={{ fontSize: '12px', margin: 0 }}>The AI is monitoring your history to flag suspicious postings.</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: '#f5f5f5', padding: '15px', borderRadius: '10px' }}>
        <input style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="Paste a Job URL here..." />
        <button onClick={async () => { await (window as any).electron.invoke('jobs:add-manual', { url: manualUrl, userId }); setManualUrl(''); loadData(); }} style={{ padding: '10px 20px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>➕ Add Job Link</button>
      </div>

      <div style={{ display: 'grid', gap: '15px' }}>
        {jobs.map(job => (
          <div key={job.id} style={{ padding: '20px', background: '#fff', border: '1px solid #eee', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <a href={job.url} target="_blank" style={{ fontSize: '18px', fontWeight: 'bold', color: '#0077b5', textDecoration: 'none' }}>{job.job_title}</a>
                <div style={{ fontWeight: 'bold', marginTop: '5px' }}>{job.company_name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>📍 {job.location} | 🔍 Profile: {job.profile_name}</div>
              </div>
              <button 
                onClick={() => handleApply(job.id)} 
                disabled={processingId === job.id}
                style={{ padding: '12px 25px', background: job.status === 'applied' ? '#999' : '#4CAF50', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {processingId === job.id ? '⏳ AI Working...' : job.status === 'applied' ? '✅ Applied' : '⚡ Apply with AI'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}