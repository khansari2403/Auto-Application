import { useState, useEffect } from 'react';

export function DocumentRepository({ userId }: { userId: number }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);

  const loadDocs = async () => {
    const result = await (window as any).electron.invoke('docs:get-all', userId);
    if (result?.success) setDocs(result.data);
  };

  useEffect(() => { loadDocs(); const i = setInterval(loadDocs, 3000); return () => clearInterval(i); }, [userId]);

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

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>📂 Master Document Repository</h2>
      
      <div style={{ background: '#f0f7ff', padding: '20px', borderRadius: '12px', marginBottom: '25px', borderLeft: '6px solid #0077b5' }}>
        <p><strong>💡 Understanding Librarian Status:</strong></p>
        <ul style={{ fontSize: '13px', color: '#333', lineHeight: '1.6' }}>
          <li><strong>Pending:</strong> The file is in the queue. If it stays here, check if a Librarian is active in AI Team.</li>
          <li><strong>Reading/Analyzing:</strong> The AI is currently processing the file. Large images may take up to 30 seconds.</li>
          <li><strong>Failed:</strong> The model couldn't read the file. This usually means the API key is invalid or the model doesn't support "Vision" (reading images).</li>
        </ul>
      </div>

      <input type="file" multiple accept=".pdf,.docx,.jpg,.png,.jpeg" onChange={handleUpload} style={{ marginBottom: '20px' }} />
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {docs.map(doc => {
          const status = getStatusDisplay(doc.ai_status);
          return (
            <div key={doc.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '12px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                <div style={{ fontSize: '35px' }}>{doc.file_type.includes('image') ? '🖼️' : '📄'}</div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.file_name}</div>
                  <div style={{ fontSize: '11px', color: status.color, fontWeight: 'bold', marginTop: '4px' }}>{status.text}</div>
                </div>
              </div>

              <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '8px', fontSize: '12px', minHeight: '50px', border: '1px solid #eee' }}>
                <strong>🤖 AI SUMMARY:</strong><br/>
                <span style={{ fontStyle: 'italic', color: '#555' }}>{doc.ai_summary || "Analysis in progress..."}</span>
              </div>

              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <button onClick={() => setPreview(doc)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #0077b5', color: '#0077b5', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>👁️ Preview</button>
                <button onClick={async () => { if(confirm("Delete?")) { await (window as any).electron.invoke('docs:delete', doc.id); loadDocs(); } }} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffcdd2', color: '#d32f2f', background: '#fff', cursor: 'pointer' }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {preview && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', maxWidth: '90%', maxHeight: '90%', overflow: 'auto', position: 'relative' }}>
            <button onClick={() => setPreview(null)} style={{ position: 'absolute', top: '15px', right: '15px', fontSize: '20px', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            <h3>Preview: {preview.file_name}</h3>
            {preview.content ? (
              <img src={preview.content} style={{ maxWidth: '100%', borderRadius: '8px' }} />
            ) : (
              <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>Preview not available for this file type.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}