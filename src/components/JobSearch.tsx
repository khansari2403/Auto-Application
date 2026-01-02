import { useState, useEffect } from 'react';
import { AlertsQASection } from './AlertsQASection';
import { JobHuntingControls } from './JobHuntingControls';

interface PendingQuestion {
  field: string;
  label?: string;
  question: string;
  type: string;
  category?: string;
  options?: string[];
}

// Compatibility Score Dial Component
function CompatibilityDial({ score, size = 'small' }: { score: number; size?: 'small' | 'large' }) {
  // score: 0-100, maps to red (0-25), yellow (26-50), green (51-75), gold (76-100)
  const getColor = (s: number) => {
    if (s >= 76) return { color: '#FFD700', label: 'Gold', bg: 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)' };
    if (s >= 51) return { color: '#4CAF50', label: 'Green', bg: 'linear-gradient(180deg, #4CAF50 0%, #2E7D32 100%)' };
    if (s >= 26) return { color: '#FFC107', label: 'Yellow', bg: 'linear-gradient(180deg, #FFC107 0%, #FF9800 100%)' };
    return { color: '#f44336', label: 'Red', bg: 'linear-gradient(180deg, #f44336 0%, #c62828 100%)' };
  };

  const { color, label, bg } = getColor(score);
  const height = size === 'large' ? 80 : 40;
  const width = size === 'large' ? 20 : 12;
  const fillHeight = (score / 100) * height;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '4px',
      minWidth: size === 'large' ? '50px' : '35px'
    }}>
      {/* Vertical Gauge */}
      <div style={{ 
        position: 'relative',
        width: `${width}px`, 
        height: `${height}px`, 
        borderRadius: `${width/2}px`,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {/* Fill */}
        <div style={{ 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${fillHeight}px`,
          background: bg,
          borderRadius: `0 0 ${width/2}px ${width/2}px`,
          transition: 'height 0.5s ease'
        }} />
        
        {/* Color markers on the side */}
        <div style={{ position: 'absolute', right: '-3px', top: '0', width: '3px', height: '25%', background: '#FFD700', borderRadius: '2px' }} />
        <div style={{ position: 'absolute', right: '-3px', top: '25%', width: '3px', height: '25%', background: '#4CAF50', borderRadius: '2px' }} />
        <div style={{ position: 'absolute', right: '-3px', top: '50%', width: '3px', height: '25%', background: '#FFC107', borderRadius: '2px' }} />
        <div style={{ position: 'absolute', right: '-3px', top: '75%', width: '3px', height: '25%', background: '#f44336', borderRadius: '2px' }} />
      </div>
      
      {/* Label */}
      <span style={{ 
        fontSize: size === 'large' ? '11px' : '9px', 
        fontWeight: 'bold',
        color: color,
        textTransform: 'uppercase'
      }}>
        {label}
      </span>
    </div>
  );
}

export function JobSearch({ userId }: { userId: number }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [huntingStatus, setHuntingStatus] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [autoApply, setAutoApply] = useState(false);
  const [jobHuntingActive, setJobHuntingActive] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['job_title', 'company_name', 'location', 'job_type', 'experience_level', 'role', 'date_imported']);
  
  // Smart Apply state
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([]);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [showQAModal, setShowQAModal] = useState(false);
  
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

  // Smart Apply - uses AI to fill forms and handle questions
  const handleSmartApply = async (jobId: number) => {
    const job = jobs.find(j => j.id === jobId);
    
    // Check if documents are ready
    const hasAllDocs = (!docOptions.cv || job.cv_status === 'auditor_done') &&
                       (!docOptions.motivationLetter || job.motivation_letter_status === 'auditor_done') &&
                       (!docOptions.coverLetter || job.cover_letter_status === 'auditor_done');
    
    if (!hasAllDocs) {
      const confirmGen = confirm('Some documents are not ready. Generate them first?');
      if (confirmGen) {
        await handleGenerateDocs(jobId);
        return;
      }
    }
    
    setProcessingId(jobId);
    setActiveJobId(jobId);
    
    try {
      const result = await (window as any).electron.invoke('ai:smart-apply', { jobId, userId });
      
      if (result.status === 'questions_pending' && result.pendingQuestions?.length > 0) {
        // Show Q&A modal with pending questions
        setPendingQuestions(result.pendingQuestions);
        setShowQAModal(true);
      } else if (result.status === 'submitted') {
        alert('🎉 Application submitted successfully!');
      } else if (result.status === 'review_needed') {
        alert('Please review the form in the browser window and submit manually.');
      } else if (!result.success) {
        alert('Application Error: ' + result.error);
      }
    } catch (e: any) {
      alert('Application Error: ' + e.message);
    } finally {
      setProcessingId(null);
      loadData();
    }
  };

  // Handle answers from Q&A modal
  const handleAnswersSubmit = async (answers: Array<{ field: string; answer: string; saveForLater: boolean }>) => {
    if (!activeJobId) return;
    
    setShowQAModal(false);
    setProcessingId(activeJobId);
    
    try {
      const result = await (window as any).electron.invoke('ai:continue-application', {
        jobId: activeJobId,
        userId,
        answers
      });
      
      if (result.status === 'questions_pending' && result.pendingQuestions?.length > 0) {
        setPendingQuestions(result.pendingQuestions);
        setShowQAModal(true);
      } else if (result.status === 'submitted') {
        alert('🎉 Application submitted successfully!');
        setPendingQuestions([]);
        setActiveJobId(null);
      } else if (!result.success) {
        alert('Error: ' + result.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setProcessingId(null);
      loadData();
    }
  };

  // Cancel active application
  const handleCancelApplication = async () => {
    if (activeJobId) {
      await (window as any).electron.invoke('ai:cancel-application', activeJobId);
    }
    setShowQAModal(false);
    setPendingQuestions([]);
    setActiveJobId(null);
    setProcessingId(null);
  };

  // Convert documents to PDF
  const handleConvertToPdf = async (jobId: number) => {
    setProcessingId(jobId);
    try {
      const result = await (window as any).electron.invoke('docs:convert-all-pdf', { jobId, userId });
      if (result.success) {
        alert(`✅ ${result.pdfs.length} PDF(s) created successfully!`);
      } else {
        alert('PDF conversion failed: ' + (result.errors?.join(', ') || 'Unknown error'));
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApply = async (jobId: number) => {
    const job = jobs.find(j => j.id === jobId);
    if (docOptions.manualReview && !job.user_confirmed_docs) {
      alert("Please review and confirm you are happy with the custom files before applying.");
      return;
    }
    // Use smart apply instead of old apply
    await handleSmartApply(jobId);
  };

  const handleGenerateDocs = async (jobId: number) => {
    setProcessingId(jobId);
    try {
      const result = await (window as any).electron.invoke('ai:generate-tailored-docs', { 
        jobId, 
        userId, 
        docOptions: docOptions 
      });
      if (!result.success) {
        alert('Generation Error: ' + result.error);
      }
    } catch (e: any) {
      alert('Generation Error: ' + e.message);
    } finally {
      setProcessingId(null);
      loadData();
    }
  };

  // Generate a single document type for a job
  const handleGenerateSingleDoc = async (jobId: number, docType: string) => {
    setProcessingId(jobId);
    try {
      // Create options with only the specific document type enabled
      const singleDocOptions: any = {
        cv: false,
        motivationLetter: false,
        coverLetter: false,
        portfolio: false,
        proposal: false
      };
      
      // Map the document type to the correct option key
      const typeToOption: Record<string, string> = {
        'cv': 'cv',
        'motivation_letter': 'motivationLetter',
        'cover_letter': 'coverLetter',
        'portfolio': 'portfolio',
        'proposal': 'proposal'
      };
      
      const optionKey = typeToOption[docType];
      if (optionKey) {
        singleDocOptions[optionKey] = true;
      }
      
      const result = await (window as any).electron.invoke('ai:generate-tailored-docs', { 
        jobId, 
        userId, 
        docOptions: singleDocOptions 
      });
      if (!result.success) {
        alert('Generation Error: ' + result.error);
      }
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
        // Generate ONLY this specific document type
        handleGenerateSingleDoc(job.id, type);
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
      {/* Job Hunting Control Center */}
      <JobHuntingControls userId={userId} onSettingsChange={loadData} />

      {/* Q&A Modal */}
      {showQAModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.6)', zIndex: 2000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{ 
            background: 'var(--bg-primary)', 
            borderRadius: '16px', 
            width: '100%', 
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>🤖 AI Assistant Needs Your Input</h3>
              <button onClick={handleCancelApplication} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--text-primary)' }}>×</button>
            </div>
            <AlertsQASection 
              userId={userId}
              pendingQuestions={pendingQuestions}
              jobId={activeJobId || undefined}
              onAnswersSubmit={handleAnswersSubmit}
              onCancel={handleCancelApplication}
            />
          </div>
        </div>
      )}
      {showInfo && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '12px', maxWidth: '550px', position: 'relative', color: 'var(--text-primary)' }}>
            <h3>📖 Document Generation System</h3>
            <div style={{ marginTop: '15px', fontSize: '14px' }}>
              <p><strong>🧠 Thinker AI:</strong> Generates tailored documents based on your profile and job description. Uses company research to personalize content.</p>
              <p style={{ marginTop: '10px' }}><strong>🧐 Auditor AI:</strong> Reviews documents for quality, ATS compatibility, and removes AI-sounding phrases. Requests revisions if needed.</p>
              <p style={{ marginTop: '10px' }}><strong>📁 Document Types:</strong></p>
              <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
                <li><strong>CV</strong> - Tailored resume highlighting relevant experience</li>
                <li><strong>Motivation Letter</strong> - Explains why you want the role (formal)</li>
                <li><strong>Cover Letter</strong> - Brief introduction and qualifications</li>
                <li><strong>Portfolio</strong> - Summary of relevant projects</li>
                <li><strong>Proposal</strong> - Business approach for the role</li>
              </ul>
              <p style={{ marginTop: '10px' }}><strong>📊 Status Icons:</strong></p>
              <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                <span>🔄 Generate/Retry</span>
                <span>✓ AI Generated</span>
                <span>✓✓ Auditor Approved</span>
              </div>
            </div>
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
              <th style={{ padding: '12px', textAlign: 'center', background: 'rgba(102, 126, 234, 0.1)', color: '#667eea', width: '60px' }}>Match</th>
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
                {/* Compatibility Score Dial */}
                <td style={{ padding: '8px', textAlign: 'center', background: 'rgba(102, 126, 234, 0.05)' }}>
                  <CompatibilityDial score={job.compatibility_score || Math.floor(Math.random() * 100)} size="small" />
                </td>
                <td style={{ padding: '12px', background: 'var(--bg-tertiary)' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    {docOptions.cv && renderDocIcon(job, 'cv', 'CV', 'CV')}
                    {docOptions.motivationLetter && renderDocIcon(job, 'motivation_letter', 'Motivation Letter', 'ML')}
                    {docOptions.portfolio && renderDocIcon(job, 'portfolio', 'Portfolio', 'PT')}
                    {docOptions.proposal && renderDocIcon(job, 'proposal', 'Proposal', 'PR')}
                    {docOptions.coverLetter && renderDocIcon(job, 'cover_letter', 'Cover Letter', 'CL')}
                    {/* PDF button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleConvertToPdf(job.id); }}
                      title="Convert all documents to PDF"
                      style={{ 
                        width: '28px', height: '28px', borderRadius: '6px', 
                        background: 'var(--card-bg)', border: '1px solid var(--border)',
                        cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      📄
                    </button>
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
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleSmartApply(job.id)} 
                            disabled={processingId === job.id || (docOptions.manualReview && !job.user_confirmed_docs)} 
                            style={{ 
                              padding: '6px 12px', 
                              background: job.status === 'applied' ? 'var(--text-tertiary)' : 'var(--success)', 
                              color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' 
                            }}
                          >
                            {processingId === job.id ? '⏳...' : job.status === 'applied' ? '✓ Applied' : '🤖 Smart Apply'}
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