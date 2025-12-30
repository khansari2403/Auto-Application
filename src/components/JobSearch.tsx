import { useState, useEffect } from 'react';

/**
 * Job Search Component - Phase 3.6
 * CRITICAL: ALL ORIGINAL FEATURES PRESERVED + NEW DOCUMENTATION LOGIC.
 */
export function JobSearch({ userId }: { userId: number }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [huntingStatus, setHuntingStatus] = useState('');
  const [timers, setTimers] = useState<{ [key: number]: number }>({});
  const [manualUrl, setManualUrl] = useState('');
  const [autoApply, setAutoApply] = useState(false);
  const [jobHuntingActive, setJobHuntingActive] = useState(false);
  const [huntingHour, setHuntingHour] = useState(9);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['job_title', 'company_name', 'location', 'job_type', 'experience_level', 'role', 'date_imported']);
  
  // Documentation Options State
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
    if (jobRes?.success) {
      setJobs(jobRes.data.sort((a: any) => a.needs_user_intervention ? -1 : 1));
      setTimers(prev => {
        const newTimers = { ...prev };
        let changed = false;
        jobRes.data.forEach((job: any) => {
          if (job.needs_user_intervention === 1 && newTimers[job.id] === undefined) {
            newTimers[job.id] = 10;
            changed = true;
          }
        });
        return changed ? newTimers : prev;
      });
    }
    
    const settingsRes = await (window as any).electron.invoke('settings:get', userId);
    if (settingsRes?.success && settingsRes.data) {
      setAutoApply(settingsRes.data.auto_apply === 1);
      setJobHuntingActive(settingsRes.data.job_hunting_active === 1);
      setHuntingHour(settingsRes.data.hunting_hour || 9);
    }
  };

  useEffect(() => { loadData(); const i = setInterval(loadData, 5000); return () => clearInterval(i); }, [userId]);

  // Auto-Apply Logic (Disabled if tailored docs are requested)
  useEffect(() => {
    const tailoredDocsRequested = docOptions.cv || docOptions.motivationLetter || docOptions.portfolio || docOptions.proposal || docOptions.coverLetter;
    if (autoApply && !processingId && !tailoredDocsRequested) {
      const nextJob = jobs.find(j => j.status === 'analyzed' || j.status === 'analyzing_failed');
      if (nextJob) handleApply(nextJob.id);
    }
  }, [autoApply, jobs, processingId, docOptions]);

  const handleStartHunterSearch = async () => {
    if (!jobHuntingActive) return;
    setIsSearching(true);
    setHuntingStatus('Initializing Hunters...');
    try {
      const result = await (window as any).electron.invoke('hunter:start-search', userId);
      setHuntingStatus(result.success ? 'Search Completed Successfully.' : 'Search Failed: ' + result.error);
    } catch (e: any) {
      setHuntingStatus('Search Error.');
    } finally {
      setIsSearching(false);
      loadData();
      setTimeout(() => setHuntingStatus(''), 10000);
    }
  };

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

  const handleConfirmDocs = async (jobId: number, confirmed: boolean) => {
    await (window as any).electron.invoke('jobs:update-doc-confirmation', { jobId, confirmed: confirmed ? 1 : 0 });
    loadData();
  };

  const handleAddManual = async () => {
    if (!manualUrl) return;
    const result = await (window as any).electron.invoke('jobs:add-manual', { userId, url: manualUrl });
    if (!result.success) alert(result.error);
    setManualUrl('');
    loadData();
  };

  const handleDelete = async (id: number) => {
    await (window as any).electron.invoke('jobs:delete', id);
    loadData();
  };

  const toggleAutoApply = async () => {
    const newVal = !autoApply;
    setAutoApply(newVal);
    await (window as any).electron.invoke('settings:update', { id: 1, auto_apply: newVal ? 1 : 0 });
  };

  const renderDocIcon = (job: any, type: string, label: string) => {
    const status = job[`${type}_status`];
    const path = job[`${type}_path`];

    return (
      <div 
        onClick={() => status === 'auditor_done' ? (window as any).electron.invoke('docs:open-file', path) : handleGenerateDocs(job.id)}
        title={`${label}: ${status || 'Not started'}`}
        style={{ 
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '22px', height: '22px', borderRadius: '4px', background: '#f5f5f5', border: '1px solid #ddd',
          fontSize: '9px', position: 'relative', fontWeight: 'bold'
        }}
      >
        {type.toUpperCase().substring(0, 2)}
        {status === 'thinker_done' && <span style={{ position: 'absolute', bottom: -3, right: -1, color: '#4CAF50', fontSize: '12px' }}>✓</span>}
        {status === 'auditor_done' && <span style={{ position: 'absolute', bottom: -3, right: -1, color: '#4CAF50', fontSize: '12px' }}>✓✓</span>}
        {(!status || status === 'none' || status === 'failed') && <span style={{ position: 'absolute', bottom: -2, right: -1, fontSize: '8px' }}>🔄</span>}
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <style>{`
        @keyframes moveMagnifier { 0% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(0, -10px) rotate(0deg); } 100% { transform: translate(0, 0) rotate(0deg); } }
        .magnifier-icon { display: inline-block; animation: moveMagnifier 2s infinite ease-in-out; margin-right: 10px; font-size: 20px; }
        .hunting-status { background: #e3f2fd; color: #0d47a1; padding: 10px 15px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; font-weight: bold; border: 1px solid #bbdefb; display: flex; align-items: center; }
      `}</style>

      {/* INFO POPUP */}
      {showInfo && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', maxWidth: '500px', position: 'relative' }}>
            <h3>📖 Documentation Rules</h3>
            <p><strong>Thinker AI:</strong> Creates tailored versions based on your repository source files.</p>
            <p><strong>Auditor AI:</strong> Verifies files for ATS compatibility and hallucinations.</p>
            <p><strong>Status Marks:</strong> 🔄 (Retry/Start), ✓ (Thinker Done), ✓✓ (Auditor Verified).</p>
            <p><strong>Ghost Jobs:</strong> Automatic generation is disabled to save tokens. Use the manual button.</p>
            <button onClick={() => setShowInfo(false)} style={{ position: 'absolute', top: 10, right: 10, border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px' }}>×</button>
          </div>
        </div>
      )}

      {/* TOP CONFIGURATION ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '20px' }}>
        {/* Manual URL Box */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', flex: 1.5 }}>
          <h4 style={{ marginTop: 0 }}>🔗 Add Job Manually</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type='text' value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder='Paste Job URL here...' style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} />
            <button onClick={handleAddManual} style={{ padding: '10px 20px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Add Job</button>
          </div>
        </div>

        {/* Documentation Box */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #0077b5', flex: 2, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, color: '#0077b5' }}>📄 Application Specific Documentations</h4>
            <button onClick={() => setShowInfo(true)} style={{ background: '#0077b5', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}>i</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {['CV', 'Motivation Letter', 'Portfolio', 'Proposal', 'Cover Letter'].map(label => {
              const key = label.toLowerCase().replace(' ', '') as keyof typeof docOptions;
              return (
                <label key={label} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!docOptions[key]} onChange={() => setDocOptions(prev => ({ ...prev, [key]: !prev[key] }))} /> {label}
                </label>
              );
            })}
          </div>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#e91e63', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={docOptions.manualReview} onChange={() => setDocOptions(prev => ({ ...prev, manualReview: !prev.manualReview }))} /> Review files manually before applying
          </label>
        </div>

        {/* Job Hunting Box */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', textAlign: 'center', flex: 1.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0 }}>🚀 Job Hunting</h4>
            <button onClick={() => (window as any).electron.invoke('settings:update', { id: 1, job_hunting_active: jobHuntingActive ? 0 : 1 }).then(loadData)} style={{ padding: '4px 10px', background: jobHuntingActive ? '#4CAF50' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
              {jobHuntingActive ? 'ACTIVE' : 'OFF'}
            </button>
          </div>
          <button onClick={handleStartHunterSearch} disabled={isSearching || !jobHuntingActive} style={{ padding: '12px 20px', background: '#673ab7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="magnifier-icon">🔍</span> {isSearching ? 'Hunting...' : 'Start Job Hunting'}
          </button>
        </div>
        
        {/* Auto-Apply Box */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', textAlign: 'center', flex: 1 }}>
          <h4 style={{ marginTop: 0 }}>🤖 Auto-Apply</h4>
          <button onClick={toggleAutoApply} style={{ padding: '10px 30px', background: autoApply ? '#4CAF50' : '#ccc', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
            {autoApply ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {huntingStatus && <div className="hunting-status"><span>📡</span> {huntingStatus}</div>}

      {/* COLUMN CUSTOMIZATION */}
      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #eee' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: '#666' }}>⚙️ CUSTOMIZE TABLE COLUMNS (24 CRITERIA):</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {allColumns.map(col => (
            <button key={col.id} onClick={() => toggleColumn(col.id)} style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '20px', border: '1px solid #ccc', background: visibleColumns.includes(col.id) ? '#0077b5' : '#fff', color: visibleColumns.includes(col.id) ? '#fff' : '#666', cursor: 'pointer' }}>{col.label}</button>
          ))}
        </div>
      </div>

      {/* JOBS TABLE */}
      <h2>🎯 Found Jobs</h2>
      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', border: '1px solid #eee' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '10px', textAlign: 'center' }}>Docs</th>
              {allColumns.filter(c => visibleColumns.includes(c.id)).map(col => (
                <th key={col.id} style={{ padding: '10px', textAlign: 'left', whiteSpace: 'nowrap' }}>{col.label}</th>
              ))}
              <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.id} style={{ borderBottom: '1px solid #eee', background: job.status === 'ghost_job_detected' ? '#fff3e0' : 'transparent' }}>
                <td style={{ padding: '10px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {docOptions.cv && renderDocIcon(job, 'cv', 'CV')}
                    {docOptions.motivationLetter && renderDocIcon(job, 'motivation_letter', 'ML')}
                    {docOptions.portfolio && renderDocIcon(job, 'portfolio', 'PT')}
                    {docOptions.proposal && renderDocIcon(job, 'proposal', 'PR')}
                    {docOptions.coverLetter && renderDocIcon(job, 'cover_letter', 'CL')}
                  </div>
                </td>
                {visibleColumns.includes('job_title') && (
                  <td style={{ padding: '10px' }}>
                    <a href={job.url} target='_blank' rel='noreferrer' style={{ color: '#0077b5', textDecoration: 'none', fontWeight: 'bold' }}>{job.job_title} 🔗</a>
                    {job.status === 'ghost_job_detected' && <div style={{ fontSize: '9px', color: '#ef6c00', fontWeight: 'bold' }}>👻 GHOST JOB DETECTED</div>}
                  </td>
                )}
                {allColumns.filter(c => visibleColumns.includes(c.id) && c.id !== 'job_title').map(col => (
                  <td key={col.id} style={{ padding: '10px' }}>{job[col.id] || 'N/A'}</td>
                ))}
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
                    {job.status === 'ghost_job_detected' ? (
                      <button onClick={() => handleGenerateDocs(job.id)} style={{ padding: '5px 10px', background: '#ef6c00', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Make Documents for this Position</button>
                    ) : (
                      <>
                        {docOptions.manualReview && (
                          <label style={{ fontSize: '9px', color: '#666', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <input type="checkbox" checked={!!job.user_confirmed_docs} onChange={(e) => handleConfirmDocs(job.id, e.target.checked)} /> Happy with files?
                          </label>
                        )}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => handleApply(job.id)} disabled={processingId === job.id || (docOptions.manualReview && !job.user_confirmed_docs)} style={{ padding: '5px 15px', background: job.status === 'applied' ? '#999' : '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                            {processingId === job.id ? '...' : job.status === 'applied' ? 'Applied' : 'Apply'}
                          </button>
                          <button onClick={() => handleDelete(job.id)} style={{ padding: '5px', background: '#fff', color: '#f44336', border: '1px solid #ffcdd2', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
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