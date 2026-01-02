import { useState, useEffect } from 'react';

export function DocumentRepository({ userId }: { userId: number }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocs = async () => {
    try {
      const result = await (window as any).electron.invoke('docs:get-all', userId);
      if (result?.success) {
        setDocs(result.data || []);
        setError(null);
      } else {
        setDocs([]);
      }
    } catch (e: any) {
      console.error('Failed to load documents:', e);
      setError('Failed to load documents');
      setDocs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    loadDocs(); 
    const i = setInterval(loadDocs, 5000); 
    return () => clearInterval(i); 
  }, [userId]);

  const handleUpload = async (e: any) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const f = file as any;
      const reader = new FileReader();
      reader.onload = async (event) => {
        await (window as any).electron.invoke('docs:save', {
          userId, fileName: f.name, fileType: f.type, content: event.target?.result,
          category: f.name.toLowerCase().includes('cv') ? 'CV' : 'Certificate'
        });
      };
      reader.readAsDataURL(f);
    }
  };

  const getStatusDisplay = (status: string) => {
    if (status === 'pending') return { text: '⏳ Waiting for Librarian...', color: '#999' };
    if (status === 'reading') return { text: '📖 Librarian is Reading...', color: '#0077b5' };
    if (status === 'analyzing') return { text: '🧠 Librarian is Analyzing...', color: '#673ab7' };
    if (status === 'verified') return { text: '✅ AI Verified & Added', color: '#4CAF50' };
    if (status?.startsWith('failed')) return { text: '❌ ' + status, color: '#f44336' };
    return { text: '⏳ Initializing...', color: '#999' };
  };

  const renderPreview = (doc: any) => {
    if (!doc.content) return <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>No content available.</div>;

    if (doc.file_type.includes('image')) {
      return <img src={doc.content} style={{ maxWidth: '100%', borderRadius: '8px' }} />;
    }

    if (doc.file_type.includes('pdf')) {
      return <iframe src={doc.content} style={{ width: '100%', height: '600px', border: 'none', borderRadius: '8px' }} />;
    }

    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666', background: '#f9f9f9', borderRadius: '8px' }}>
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>📄</div>
        Preview not available for <strong>{doc.file_type}</strong>.<br/>
        Please download the file to view it.
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', background: 'var(--bg-primary)', minHeight: '100%' }}>
      <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>📂 Master Document Repository</h2>
      
      <div style={{ background: 'var(--info-light)', padding: '20px', borderRadius: '12px', marginBottom: '25px', borderLeft: '6px solid var(--info)' }}>
        <p style={{ margin: 0, color: 'var(--text-primary)' }}><strong>💡 Understanding Librarian Status:</strong></p>
        <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: 0 }}>
          <li><strong>Pending:</strong> The file is in the queue. If it stays here, check if a Librarian is active in AI Team.</li>
          <li><strong>Reading/Analyzing:</strong> The AI is currently processing the file. Large images may take up to 30 seconds.</li>
          <li><strong>Failed:</strong> The model couldn't read the file. This usually means the API key is invalid or the model doesn't support "Vision".</li>
        </ul>
      </div>

      <input 
        type="file" 
        multiple 
        accept=".pdf,.docx,.jpg,.png,.jpeg" 
        onChange={handleUpload} 
        style={{ marginBottom: '20px', color: 'var(--text-primary)' }} 
      />

      {isLoading && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          Loading documents...
        </div>
      )}

      {error && (
        <div style={{ padding: '20px', background: 'var(--danger-light)', borderRadius: '8px', marginBottom: '20px', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {!isLoading && docs.length === 0 && !error && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
          <p style={{ margin: 0 }}>No documents uploaded yet. Upload your CVs, certificates, and other documents above.</p>
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {docs.map(doc => {
          const status = getStatusDisplay(doc.ai_status);
          return (
            <div key={doc.id} style={{ padding: '15px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--card-bg)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                <div style={{ fontSize: '35px' }}>{doc.file_type?.includes('image') ? '🖼️' : '📄'}</div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{doc.file_name}</div>
                  <div style={{ fontSize: '11px', color: status.color, fontWeight: 'bold', marginTop: '4px' }}>{status.text}</div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '8px', fontSize: '12px', minHeight: '50px', border: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>🤖 AI SUMMARY:</strong><br/>
                <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{doc.ai_summary || "Analysis in progress..."}</span>
              </div>

              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <button onClick={() => setPreview(doc)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #0077b5', color: '#0077b5', background: 'var(--card-bg)', cursor: 'pointer', fontWeight: 'bold' }}>👁️ Preview</button>
                <button onClick={async () => { if(confirm("Delete this document?")) { await (window as any).electron.invoke('docs:delete', doc.id); loadDocs(); } }} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--danger-light)', color: 'var(--danger)', background: 'var(--card-bg)', cursor: 'pointer' }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {preview && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--card-bg)', padding: '25px', borderRadius: '16px', maxWidth: '90%', maxHeight: '90%', width: '800px', overflow: 'auto', position: 'relative' }}>
            <button onClick={() => setPreview(null)} style={{ position: 'absolute', top: '15px', right: '15px', fontSize: '20px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>✕</button>
            <h3 style={{ color: 'var(--text-primary)' }}>Preview: {preview.file_name}</h3>
            {renderPreview(preview)}
          </div>
        </div>
      )}
    </div>
  );
}