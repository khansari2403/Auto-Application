import { useState, useEffect } from 'react';

interface StoredDocument {
  company: string;
  position: string;
  files: { name: string; path: string; type: string; date: string }[];
}

export function StorageSettings({ userId }: { userId: number }) {
  const [path, setPath] = useState('');
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSettings();
    loadDocuments();
  }, []);

  const loadSettings = async () => {
    const res = await (window as any).electron.invoke('settings:get');
    if (res?.success) setPath(res.data.storage_path || '');
  };

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      // Get all documents from database
      const docsRes = await (window as any).electron.invoke('docs:get-all', userId);
      const jobsRes = await (window as any).electron.invoke('jobs:get-all', userId);
      
      if (docsRes?.success && jobsRes?.success) {
        const docs = docsRes.data || [];
        const jobs = jobsRes.data || [];
        
        // Group documents by company and position
        const grouped: Record<string, StoredDocument> = {};
        
        // First, add all documents from the documents table
        for (const doc of docs) {
          // Find the job this document belongs to
          const job = jobs.find((j: any) => j.id === doc.job_id);
          const company = doc.company_name || job?.company_name || 'Unknown Company';
          const position = doc.job_title || job?.job_title || 'Unknown Position';
          const key = `${company}___${position}`;
          
          if (!grouped[key]) {
            grouped[key] = { company, position, files: [] };
          }
          
          // Avoid duplicates
          const fileId = doc.file_path || `${doc.category}_${doc.id}`;
          const exists = grouped[key].files.some(f => f.path === fileId || f.name === doc.file_name);
          if (!exists) {
            grouped[key].files.push({
              name: doc.file_name || `${doc.category}_${doc.id}`,
              path: doc.file_path || '',
              type: doc.category || 'Unknown',
              date: doc.created_at || new Date().toISOString()
            });
          }
        }
        
        // Then, add all document paths from job records
        for (const job of jobs) {
          const key = `${job.company_name || 'Unknown'}___${job.job_title || 'Unknown'}`;
          if (!grouped[key]) {
            grouped[key] = { company: job.company_name || 'Unknown', position: job.job_title || 'Unknown', files: [] };
          }
          
          // Check ALL document type paths in job record
          const docTypes = [
            { key: 'cv_path', type: 'CV', status: 'cv_status' },
            { key: 'motivation_letter_path', type: 'Motivation Letter', status: 'motivation_letter_status' },
            { key: 'cover_letter_path', type: 'Cover Letter', status: 'cover_letter_status' },
            { key: 'portfolio_path', type: 'Portfolio', status: 'portfolio_status' },
            { key: 'proposal_path', type: 'Proposal', status: 'proposal_status' }
          ];
          
          for (const docType of docTypes) {
            if (job[docType.key]) {
              const filePath = job[docType.key];
              const exists = grouped[key].files.some(f => f.path === filePath);
              if (!exists) {
                // Determine status
                const status = job[docType.status] || 'unknown';
                let statusSuffix = '';
                if (status === 'auditor_done') statusSuffix = ' ✓✓';
                else if (status === 'thinker_done') statusSuffix = ' ✓';
                else if (status === 'rejected') statusSuffix = ' ⚠';
                
                grouped[key].files.push({
                  name: filePath.split('/').pop() || `${docType.type}.html`,
                  path: filePath,
                  type: docType.type + statusSuffix,
                  date: job.date_imported || new Date().toISOString()
                });
              }
            }
          }
          
          // Also check for PDF versions
          const pdfTypes = ['cv_pdf_path', 'motivation_letter_pdf_path', 'cover_letter_pdf_path', 'portfolio_pdf_path', 'proposal_pdf_path'];
          for (const pdfKey of pdfTypes) {
            if (job[pdfKey]) {
              const filePath = job[pdfKey];
              const exists = grouped[key].files.some(f => f.path === filePath);
              if (!exists) {
                grouped[key].files.push({
                  name: filePath.split('/').pop() || 'document.pdf',
                  path: filePath,
                  type: pdfKey.replace('_pdf_path', '').replace(/_/g, ' ').toUpperCase() + ' (PDF)',
                  date: job.date_imported || new Date().toISOString()
                });
              }
            }
          }
        }
        
        // Sort files within each group by date (newest first)
        for (const key of Object.keys(grouped)) {
          grouped[key].files.sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        }
        
        // Filter out empty groups and set state
        const result = Object.values(grouped).filter(g => g.files.length > 0);
        
        // Sort groups by most recent file date
        result.sort((a, b) => {
          const aDate = a.files[0]?.date || '';
          const bDate = b.files[0]?.date || '';
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
        
        setDocuments(result);
      }
    } catch (e) {
      console.error('Failed to load documents:', e);
    }
    setIsLoading(false);
  };

  const handleSelect = async () => {
    const selectedPath = await (window as any).electron.invoke('settings:select-directory');
    if (selectedPath) {
      await (window as any).electron.invoke('settings:update', { id: 1, storagePath: selectedPath });
      setPath(selectedPath);
      alert("Storage path updated! All generated CVs will be saved here.");
    }
  };

  const openFile = async (filePath: string) => {
    await (window as any).electron.invoke('docs:open-file', filePath);
  };

  const toggleCompany = (company: string) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(company)) {
        newSet.delete(company);
      } else {
        newSet.add(company);
      }
      return newSet;
    });
  };

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('cv')) return '📄';
    if (t.includes('motivation')) return '📝';
    if (t.includes('cover')) return '✉️';
    if (t.includes('portfolio')) return '🎨';
    if (t.includes('proposal')) return '📋';
    return '📁';
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h3>💾 Local Storage Configuration</h3>
      <p style={{ color: '#666', fontSize: '14px' }}>
        All generated documents are stored locally organized by Company → Position
      </p>
      
      <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', marginTop: '20px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>Current Save Directory:</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            readOnly 
            value={path || 'Default: AppData/generated_docs'} 
            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: '#eee' }} 
          />
          <button onClick={handleSelect} style={{ padding: '10px 20px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            📁 Change Folder
          </button>
          <button onClick={loadDocuments} style={{ padding: '10px 20px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Document Browser */}
      <div style={{ marginTop: '30px' }}>
        <h4 style={{ marginBottom: '15px' }}>📂 Stored Documents by Company & Position</h4>
        
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            ⏳ Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666', background: '#f5f5f5', borderRadius: '12px' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
            <p>No documents found yet.</p>
            <p style={{ fontSize: '13px' }}>Documents will appear here after you generate CVs, Cover Letters, etc.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {documents.map((doc, idx) => (
              <div key={idx} style={{ 
                background: '#fff', 
                border: '1px solid #e0e0e0', 
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                {/* Company/Position Header */}
                <div 
                  onClick={() => toggleCompany(`${doc.company}___${doc.position}`)}
                  style={{ 
                    padding: '15px', 
                    background: expandedCompanies.has(`${doc.company}___${doc.position}`) ? '#e3f2fd' : '#fafafa',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: expandedCompanies.has(`${doc.company}___${doc.position}`) ? '1px solid #bbdefb' : 'none'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#333' }}>🏢 {doc.company}</div>
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>💼 {doc.position}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ 
                      background: '#e0e0e0', 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontSize: '12px',
                      color: '#555'
                    }}>
                      {doc.files.length} file{doc.files.length !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: '18px' }}>
                      {expandedCompanies.has(`${doc.company}___${doc.position}`) ? '▼' : '▶'}
                    </span>
                  </div>
                </div>
                
                {/* Files List */}
                {expandedCompanies.has(`${doc.company}___${doc.position}`) && (
                  <div style={{ padding: '10px 15px' }}>
                    {doc.files.map((file, fidx) => (
                      <div 
                        key={fidx}
                        onClick={() => openFile(file.path)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px',
                          padding: '10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          marginBottom: '5px',
                          background: '#f9f9f9',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#e8f4fd'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#f9f9f9'}
                      >
                        <span style={{ fontSize: '20px' }}>{getFileIcon(file.type)}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: '13px' }}>{file.name}</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>
                            {file.type} • {new Date(file.date).toLocaleDateString()}
                          </div>
                        </div>
                        <button style={{ 
                          padding: '4px 10px', 
                          fontSize: '11px', 
                          background: '#0077b5', 
                          color: '#fff', 
                          border: 'none', 
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}>
                          Open
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}