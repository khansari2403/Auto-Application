import { useState, useEffect } from 'react';

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

  useEffect(() => {
    if (autoApply && !processingId) {
      const nextJob = jobs.find(j => j.status === 'analyzed' || j.status === 'analyzing_failed');
      if (nextJob) handleApply(nextJob.id);
    }
  }, [autoApply, jobs, processingId]);

  const handleStartHunterSearch = async () => {
    if (!jobHuntingActive) return;
    setIsSearching(true);
    setHuntingStatus('Initializing Hunters...');
    try {
      const profilesRes = await (window as any).electron.invoke('profiles:get-all', userId);
      const websitesRes = await (window as any).electron.invoke('websites:get-all', userId);
      const modelsRes = await (window as any).electron.invoke('ai-models:get-all', userId);

      const activeProfiles = profilesRes.data.filter((p: any) => p.is_active === 1);
      const activeWebsites = websitesRes.data.filter((w: any) => w.is_active === 1);
      const hunterModel = modelsRes.data.find((m: any) => m.role === 'Hunter' && m.status === 'active');

      if (hunterModel && activeProfiles.length > 0 && activeWebsites.length > 0) {
        const profileTitles = activeProfiles.map((p: any) => p.job_title || p.profile_name).join(', ');
        const siteNames = activeWebsites.map((w: any) => w.website_name).join(', ');
        setHuntingStatus(`Hunter (${hunterModel.model_name}) is searching ${siteNames} for: ${profileTitles}`);
      }

      const result = await (window as any).electron.invoke('hunter:start-search', userId);
      if (!result.success) {
        alert('Hunter Search Failed: ' + result.error);
        setHuntingStatus('Search Failed.');
      } else {
        setHuntingStatus('Search Completed Successfully.');
      }
    } catch (e: any) {
      alert('Hunter Search Error: ' + e.message);
      setHuntingStatus('Search Error.');
    } finally {
      setIsSearching(false);
      loadData();
      setTimeout(() => setHuntingStatus(''), 10000);
    }
  };

  const handleApply = async (jobId: number) => {
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

  const toggleJobHunting = async () => {
    const newVal = !jobHuntingActive;
    setJobHuntingActive(newVal);
    await (window as any).electron.invoke('settings:update', { id: 1, job_hunting_active: newVal ? 1 : 0 });
  };

  const updateHuntingHour = async (hour: number) => {
    setHuntingHour(hour);
    await (window as any).electron.invoke('settings:update', { id: 1, hunting_hour: hour });
  };

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
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

  const handleIntervention = async (jobId: number, allowAI: boolean) => {
    setProcessingId(jobId);
    await (window as any).electron.invoke('ai:handle-intervention', jobId, userId, allowAI);
    setProcessingId(null);
    loadData();
  };

  const toggleAutoApply = async () => {
    const newVal = !autoApply;
    setAutoApply(newVal);
    await (window as any).electron.invoke('settings:update', { id: 1, auto_apply: newVal ? 1 : 0 });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <style>{`
        @keyframes moveMagnifier {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(5px, -5px) rotate(10deg); }
          50% { transform: translate(0, -10px) rotate(0deg); }
          75% { transform: translate(-5px, -5px) rotate(-10deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        .magnifier-icon {
          display: inline-block;
          animation: moveMagnifier 2s infinite ease-in-out;
          margin-right: 10px;
          font-size: 20px;
        }
        .hunting-status {
          background: #e3f2fd;
          color: #0d47a1;
          padding: 10px 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 13px;
          font-weight: bold;
          border: 1px solid #bbdefb;
          display: flex;
          align-items: center;
        }
        .btn-disabled {
          background: #ccc !important;
          cursor: not-allowed !important;
          opacity: 0.6;
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', flex: 2 }}>
          <h4 style={{ marginTop: 0 }}>🔗 Add Job Manually</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type='text' value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder='Paste Job URL here...' style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} />
            <button onClick={handleAddManual} style={{ padding: '10px 20px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Add Job</button>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', textAlign: 'center', flex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0 }}>🚀 Job Hunting</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: '#666' }}>Daily at:</span>
              <select value={huntingHour} onChange={e => updateHuntingHour(parseInt(e.target.value))} style={{ padding: '2px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '11px' }}>
                {[...Array(24)].map((_, i) => <option key={i} value={i}>{i}:00</option>)}
              </select>
              <button onClick={toggleJobHunting} style={{ padding: '4px 10px', background: jobHuntingActive ? '#4CAF50' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
                {jobHuntingActive ? 'ACTIVE' : 'OFF'}
              </button>
            </div>
          </div>
          <button 
            onClick={handleStartHunterSearch} 
            disabled={isSearching || !jobHuntingActive}
            className={(!jobHuntingActive || isSearching) ? 'btn-disabled' : ''}
            style={{ 
              padding: '12px 20px', 
              background: isSearching ? '#9c27b0' : '#673ab7', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 'bold', 
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}
          >
            <span className="magnifier-icon">🔍</span>
            {isSearching ? 'Hunting in Progress...' : 'Start Job Hunting'}
          </button>
        </div>
        
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', textAlign: 'center', flex: 1 }}>
          <h4 style={{ marginTop: 0 }}>🤖 Auto-Apply</h4>
          <button 
            onClick={toggleAutoApply} 
            style={{ padding: '10px 30px', background: autoApply ? '#4CAF50' : '#ccc', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
          >
            {autoApply ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {huntingStatus && (
        <div className="hunting-status">
          <span style={{ marginRight: '10px' }}>📡</span>
          {huntingStatus}
        </div>
      )}

      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #eee' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: '#666' }}>⚙️ CUSTOMIZE TABLE COLUMNS (24 CRITERIA):</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {allColumns.map(col => (
            <button key={col.id} onClick={() => toggleColumn(col.id)} style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '20px', border: '1px solid #ccc', background: visibleColumns.includes(col.id) ? '#0077b5' : '#fff', color: visibleColumns.includes(col.id) ? '#fff' : '#666', cursor: 'pointer' }}>
              {col.label}
            </button>
          ))}
        </div>
      </div>

      <h2>🎯 Found Jobs</h2>
      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', border: '1px solid #eee' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
              {allColumns.filter(c => visibleColumns.includes(c.id)).map(col => (
                <th key={col.id} style={{ padding: '10px', textAlign: 'left', whiteSpace: 'nowrap' }}>{col.label}</th>
              ))}
              <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.id} style={{ borderBottom: '1px solid #eee', background: job.needs_user_intervention ? '#fff5f8' : 'transparent' }}>
                {visibleColumns.includes('job_title') && (
                  <td style={{ padding: '10px' }}>
                    <a href={job.url} target='_blank' rel='noreferrer' style={{ color: '#0077b5', textDecoration: 'none', fontWeight: 'bold' }}>{job.job_title} 🔗</a>
                    {job.status === 'analyzing' && <div style={{ fontSize: '9px', color: '#0077b5' }}>Analyzing...</div>}
                  </td>
                )}
                {visibleColumns.includes('company_name') && <td style={{ padding: '10px' }}>{job.company_name}</td>}
                {visibleColumns.includes('location') && <td style={{ padding: '10px' }}>{job.location || 'N/A'}</td>}
                {visibleColumns.includes('job_type') && <td style={{ padding: '10px' }}>{job.job_type || 'N/A'}</td>}
                {visibleColumns.includes('experience_level') && <td style={{ padding: '10px' }}>{job.experience_level || 'N/A'}</td>}
                {visibleColumns.includes('salary_range') && <td style={{ padding: '10px' }}>{job.salary_range || 'N/A'}</td>}
                {visibleColumns.includes('industry') && <td style={{ padding: '10px' }}>{job.industry || 'N/A'}</td>}
                {visibleColumns.includes('required_skills') && <td style={{ padding: '10px' }}>{job.required_skills || 'N/A'}</td>}
                {visibleColumns.includes('education_level') && <td style={{ padding: '10px' }}>{job.education_level || 'N/A'}</td>}
                {visibleColumns.includes('remote_onsite') && <td style={{ padding: '10px' }}>{job.remote_onsite || 'N/A'}</td>}
                {visibleColumns.includes('benefits') && <td style={{ padding: '10px' }}>{job.benefits || 'N/A'}</td>}
                {visibleColumns.includes('company_size') && <td style={{ padding: '10px' }}>{job.company_size || 'N/A'}</td>}
                {visibleColumns.includes('company_rating') && <td style={{ padding: '10px' }}>{job.company_rating || 'N/A'}</td>}
                {visibleColumns.includes('deadline') && <td style={{ padding: '10px' }}>{job.deadline || 'N/A'}</td>}
                {visibleColumns.includes('certifications') && <td style={{ padding: '10px' }}>{job.certifications || 'N/A'}</td>}
                {visibleColumns.includes('languages') && <td style={{ padding: '10px' }}>{job.languages || 'N/A'}</td>}
                {visibleColumns.includes('visa_sponsorship') && <td style={{ padding: '10px' }}>{job.visa_sponsorship || 'N/A'}</td>}
                {visibleColumns.includes('relocation') && <td style={{ padding: '10px' }}>{job.relocation || 'N/A'}</td>}
                {visibleColumns.includes('travel_requirement') && <td style={{ padding: '10px' }}>{job.travel_requirement || 'N/A'}</td>}
                {visibleColumns.includes('shift_schedule') && <td style={{ padding: '10px' }}>{job.shift_schedule || 'N/A'}</td>}
                {visibleColumns.includes('role') && <td style={{ padding: '10px' }}>{job.role || 'N/A'}</td>}
                {visibleColumns.includes('date_imported') && <td style={{ padding: '10px' }}>{job.date_imported || 'N/A'}</td>}
                {visibleColumns.includes('posted_date') && <td style={{ padding: '10px' }}>{job.posted_date || 'N/A'}</td>}
                {visibleColumns.includes('application_url') && <td style={{ padding: '10px' }}><a href={job.application_url} target='_blank' rel='noreferrer' style={{ color: '#666' }}>Link</a></td>}
                
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    {job.needs_user_intervention === 1 ? (
                      <button onClick={() => handleIntervention(job.id, true)} disabled={processingId === job.id} style={{ padding: '3px 6px', background: '#e91e63', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>Allow AI (${timers[job.id] || 0}s)</button>
                    ) : (
                      <button onClick={() => handleApply(job.id)} disabled={processingId === job.id || job.status === 'applied' || job.status === 'analyzing'} style={{ padding: '3px 6px', background: job.status === 'applied' ? '#999' : '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>
                        {processingId === job.id ? '...' : job.status === 'applied' ? 'Applied' : 'Apply'}
                      </button>
                    )}
                    <button onClick={() => handleDelete(job.id)} style={{ padding: '3px 6px', background: '#fff', color: '#f44336', border: '1px solid #ffcdd2', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>🗑️</button>
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