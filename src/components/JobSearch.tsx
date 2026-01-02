import { useState, useEffect } from 'react';

export function JobSearch({ userId }: { userId: number }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [huntingStatus, setHuntingStatus] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [autoApply, setAutoApply] = useState(false);
  const [jobHuntingActive, setJobHuntingActive] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['job_title', 'company_name', 'location', 'job_type', 'experience_level', 'role', 'date_imported']);
  
  const [docOptions, setDocOptions] = useState({
    cv: true,
    motivationLetter: true,
    portfolio: false,
    proposal: false,
    coverLetter: true,
    manualReview: true
  });
  const [showInfo, setShowInfo] = useState(false);

  const allColumns = [
    { id: 'job_title', label: 'Job Title & URL' },
    { id: 'company_name', label: 'Company' },
    { id: 'location', label: 'Location' },
    { id: 'job_type', label: 'Type' },
    { id: 'experience_level', label: 'Experience' },
    { id: 'salary_range', label: 'Salary' },
    { id: 'industry', label: 'Industry' },
    { id: 'required_skills', label: 'Skills' },
    { id: 'education_level', label: 'Education' },
    { id: 'remote_onsite', label: 'Remote' },
    { id: 'benefits', label: 'Benefits' },
    { id: 'company_size', label: 'Co. Size' },
    { id: 'company_rating', label: 'Rating' },
    { id: 'deadline', label: 'Deadline' },
    { id: 'certifications', label: 'Certs' },
    { id: 'languages', label: 'Languages' },
    { id: 'visa_sponsorship', label: 'Visa' },
    { id: 'relocation', label: 'Relocation' },
    { id: 'travel_requirement', label: 'Travel' },
    { id: 'shift_schedule', label: 'Shift' },
    { id: 'role', label: 'Role' },
    { id: 'date_imported', label: 'Imported' },
    { id: 'posted_date', label: 'Posted' },
    { id: 'application_url', label: 'App URL' }
  ];

  const loadData = async () => {
    const jobRes = await (window as any).electron.invoke('jobs:get-all', userId);
    if (jobRes?.success) setJobs(jobRes.data.sort((a: any) => a.needs_user_intervention ? -1 : 1));
    
    const settingsRes = await (window as any).electron.invoke('settings:get', userId);
    if (settingsRes?.success && settingsRes.data) {
      setAutoApply(settingsRes.data.auto_apply === 1);
      setJobHuntingActive(settingsRes.data.job_hunting_active === 1);
    }
  };

  useEffect(() => { loadData(); const i = setInterval(loadData, 5000); return () => clearInterval(i); }, [userId]);

  const handleApply = async (jobId: number) => {
    const job = jobs.find(j => j.id === jobId);
    if (docOptions.manualReview && !job.user_confirmed_docs) {
      alert("Please review and confirm you are happy with the custom files before applying.");
      return;
    }
    setProcessingId(jobId);
    try {
      const result = await (window as any).electron.invoke('ai:process-application', jobId, userId);
      if (!result.success) alert('Application Failed: ' + result.error);
    } catch (e: any) {
      alert('Application Error: ' + e.message);
    } finally {
      setProcessingId(null);
      loadData();
    }
  };

  const handleGenerateDocs = async (jobId: number) => {
    setProcessingId(jobId);
    try {
      await (window as any).electron.invoke('ai:generate-tailored-docs', { jobId, userId, options: docOptions });
    } catch (e: any) {
      alert('Generation Error: ' + e.message);
    } finally {
      setProcessingId(null);
      loadData();
    }
  };

  const renderDocIcon = (job: any, type: string, label: string, shortLabel: string) => {
    const status = job[`${type}_status`];
    const path = job[`${type}_path`];

    const handleDocClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (status === 'auditor_done' && path) {
        // Open the completed document
        (window as any).electron.invoke('docs:open-file', path);
      } else {
        // Generate the document
        handleGenerateDocs(job.id);
      }
    };

    return (
      <div 
        onClick={handleDocClick}
        title={`${label}: ${status || 'Not started'} - Click to ${status === 'auditor_done' ? 'open' : 'generate'}`}
        style={{ 
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '28px', height: '28px', borderRadius: '6px', 
          background: status === 'auditor_done' ? 'var(--success-light)' : status === 'thinker_done' ? 'var(--info-light)' : 'var(--card-bg)', 
          border: `1px solid ${status === 'auditor_done' ? 'var(--success)' : status === 'thinker_done' ? 'var(--info)' : 'var(--border)'}`,
          fontSize: '10px', position: 'relative', fontWeight: 'bold', color: 'var(--text-primary)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {shortLabel}
        {status === 'thinker_done' && <span style={{ position: 'absolute', bottom: -4, right: -2, color: 'var(--success)', fontSize: '14px' }}>✓</span>}
        {status === 'auditor_done' && <span style={{ position: 'absolute', bottom: -4, right: -2, color: 'var(--success)', fontSize: '14px' }}>✓✓</span>}
        {(!status || status === 'none' || status === 'failed') && <span style={{ position: 'absolute', bottom: -2, right: -1, fontSize: '8px' }}>🔄</span>}
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', background: 'var(--bg-primary)', minHeight: '100%' }}>
      {showInfo && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '12px', maxWidth: '500px', position: 'relative', color: 'var(--text-primary)' }}>
            <h3>📖 Documentation Rules</h3>
            <p><strong>Thinker AI:</strong> Creates tailored versions based on your repository source files.</p>
            <p><strong>Auditor AI:</strong> Verifies files for ATS compatibility and hallucinations.</p>
            <p><strong>Status Marks:</strong> 🔄 (Retry/Start), ✓ (Thinker Done), ✓✓ (Auditor Verified).</p>
            <button onClick={() => setShowInfo(false)} style={{ position: 'absolute', top: 10, right: 10, border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-primary)' }}>×</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', flex: '1 1 280px', minHeight: '140px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--text-primary)' }}>🔗 Add Job Manually</h4>
          <div style={{ display: 'flex', gap: '10px', flex: 1, alignItems: 'flex-end' }}>
            <input type='text' value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder='Paste Job URL here...' style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }} />
            <button onClick={() => (window as any).electron.invoke('jobs:add-manual', { userId, url: manualUrl })} style={{ padding: '12px 20px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', height: '44px' }}>Add Job</button>
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid #0077b5', flex: '1 1 320px', minHeight: '140px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, color: '#0077b5' }}>📄 Application Specific Documentations</h4>
            <button onClick={() => setShowInfo(true)} style={{ background: '#0077b5', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '12px' }}>i</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {['CV', 'Motivation Letter', 'Portfolio', 'Proposal', 'Cover Letter'].map(label => {
              const key = label.toLowerCase().replace(' ', '') as keyof typeof docOptions;
              return (
                <label key={label} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={!!docOptions[key]} onChange={() => setDocOptions(prev => ({ ...prev, [key]: !prev[key] }))} /> {label}
                </label>
              );
            })}
          </div>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#e91e63', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={docOptions.manualReview} onChange={() => setDocOptions(prev => ({ ...prev, manualReview: !prev.manualReview }))} /> Review files manually before applying
          </label>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center', flex: '1 1 200px', minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h4 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--text-primary)' }}>🚀 Job Hunting</h4>
          <button onClick={() => (window as any).electron.invoke('hunter:start-search', userId)} disabled={isSearching || !jobHuntingActive} style={{ padding: '12px 20px', background: '#673ab7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', height: '44px' }}>
            {isSearching ? 'Hunting...' : 'Start Job Hunting'}
          </button>
        </div>
        
        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center', flex: '1 1 160px', minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h4 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--text-primary)' }}>🤖 Auto-Apply</h4>
          <button onClick={() => (window as any).electron.invoke('settings:update', { id: 1, auto_apply: autoApply ? 0 : 1 }).then(loadData)} style={{ padding: '12px 20px', background: autoApply ? '#4CAF50' : 'var(--border)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', height: '44px' }}>
            {autoApply ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--text-secondary)' }}>⚙️ CUSTOMIZE TABLE COLUMNS:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {allColumns.map(col => (
            <button key={col.id} onClick={() => setVisibleColumns(prev => prev.includes(col.id) ? prev.filter(c => c !== col.id) : [...prev, col.id])} style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '20px', border: '1px solid var(--border)', background: visibleColumns.includes(col.id) ? '#0077b5' : 'var(--card-bg)', color: visibleColumns.includes(col.id) ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}>{col.label}</button>
          ))}
        </div>
      </div>

      <h2 style={{ color: 'var(--text-primary)' }}>🎯 Found Jobs</h2>
      <div style={{ overflowX: 'auto', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '12px', textAlign: 'center', background: 'var(--info-light)', color: 'var(--info)', width: '120px' }}>DOCs</th>
              {allColumns.filter(c => visibleColumns.includes(c.id)).map(col => (
                <th key={col.id} style={{ padding: '12px', textAlign: 'left', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{col.label}</th>
              ))}
              <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-primary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.id} style={{ borderBottom: '1px solid var(--border)', background: job.status === 'ghost_job_detected' ? 'var(--warning-light)' : 'transparent' }}>
                <td style={{ padding: '12px', background: 'var(--bg-tertiary)' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    {docOptions.cv && renderDocIcon(job, 'cv', 'CV', 'CV')}
                    {docOptions.motivationLetter && renderDocIcon(job, 'motivation_letter', 'Motivation Letter', 'ML')}
                    {docOptions.portfolio && renderDocIcon(job, 'portfolio', 'Portfolio', 'PT')}
                    {docOptions.proposal && renderDocIcon(job, 'proposal', 'Proposal', 'PR')}
                    {docOptions.coverLetter && renderDocIcon(job, 'cover_letter', 'Cover Letter', 'CL')}
                  </div>
                </td>
                {visibleColumns.includes('job_title') && (
                  <td style={{ padding: '12px' }}>
                    <a href={job.url} target='_blank' rel='noreferrer' style={{ color: '#0077b5', textDecoration: 'none', fontWeight: 'bold' }}>{job.job_title} 🔗</a>
                    {job.status === 'ghost_job_detected' && <div style={{ fontSize: '9px', color: 'var(--warning)', fontWeight: 'bold' }}>👻 GHOST JOB DETECTED</div>}
                  </td>
                )}
                {allColumns.filter(c => visibleColumns.includes(c.id) && c.id !== 'job_title').map(col => (
                  <td key={col.id} style={{ padding: '12px', color: 'var(--text-secondary)' }}>{job[col.id] || 'N/A'}</td>
                ))}
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
                    {job.status === 'ghost_job_detected' ? (
                      <button onClick={() => handleGenerateDocs(job.id)} style={{ padding: '6px 12px', background: 'var(--warning)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Make Documents for this Position</button>
                    ) : (
                      <>
                        {docOptions.manualReview && (
                          <label style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <input type="checkbox" checked={!!job.user_confirmed_docs} onChange={(e) => (window as any).electron.invoke('jobs:update-doc-confirmation', { jobId: job.id, confirmed: e.target.checked ? 1 : 0 }).then(loadData)} /> Happy with files?
                          </label>
                        )}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => handleApply(job.id)} disabled={processingId === job.id || (docOptions.manualReview && !job.user_confirmed_docs)} style={{ padding: '6px 16px', background: job.status === 'applied' ? 'var(--text-tertiary)' : 'var(--success)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                            {processingId === job.id ? '...' : job.status === 'applied' ? 'Applied' : 'Apply'}
                          </button>
                          <button onClick={() => (window as any).electron.invoke('jobs:delete', job.id).then(loadData)} style={{ padding: '6px 8px', background: 'var(--card-bg)', color: 'var(--danger)', border: '1px solid var(--danger-light)', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}