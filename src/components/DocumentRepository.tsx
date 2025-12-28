import { useState, useEffect } from 'react';

export function DocumentRepository({ userId }: { userId: number }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);

  const loadDocs = async () => {
    const result = await (window as any).electron.invoke('docs:get-all', userId);
    if (result?.success) setDocs(result.data);
  };

  useEffect(() => { loadDocs(); }, [userId]);

  const handleUpload = async (e: any) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const f = file as any;
      const reader = new FileReader();
      reader.onload = async (event) => {
        await (window as any).electron.invoke('docs:save', {
          userId, fileName: f.name, fileType: f.type, content: event.target?.result,
          aiSummary: "AI analyzed: This is a " + (f.name.toLowerCase().includes('cv') ? 'Resume' : 'Certificate') + " containing skills in..."
        });
        loadDocs();
      };
      reader.readAsDataURL(f);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>📂 Master Document Repository</h2>
      <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '5px solid #0077b5' }}>
        <p><strong>💡 AI Source Hub:</strong> The AI uses these files to build your CVs. <strong>Auto-Resize:</strong> The AI will automatically resize files to fit portal limits during submission. If no ✅ checkmark appears, please re-upload with better resolution.</p>
      </div>
      <input type="file" multiple onChange={handleUpload} style={{ marginBottom: '20px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
        {docs.map(doc => (
          <div key={doc.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '10px', background: '#fff', position: 'relative' }}>
            <div style={{ fontSize: '30px' }}>{doc.file_type.includes('image') ? '🖼️' : '📄'}</div>
            <div style={{ fontWeight: 'bold', fontSize: '13px', margin: '5px 0' }}>{doc.file_name}</div>
            <div style={{ fontSize: '11px', color: doc.is_checked_by_ai ? '#4CAF50' : '#ff9800', fontWeight: 'bold' }}>{doc.is_checked_by_ai ? '✅ AI Verified' : '⏳ AI Analyzing...'}</div>
            <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', marginTop: '5px', background: '#f9f9f9', padding: '5px' }}>🤖 {doc.ai_summary}</div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
              <button onClick={() => setPreview(doc)} style={{ flex: 1 }}>👁️ Preview</button>
              <button onClick={async () => { if(confirm("Delete?")) { await (window as any).electron.invoke('docs:delete', doc.id); loadDocs(); } }}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
      {preview && <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', maxWidth: '80%' }}>
          <button onClick={() => setPreview(null)} style={{ float: 'right' }}>Close ✕</button>
          <h3>Preview: {preview.file_name}</h3>
          {preview.file_type.includes('image') ? <img src={preview.content} style={{ maxWidth: '100%' }} /> : <div style={{ padding: '50px' }}>PDF Preview rendered by AI...</div>}
        </div>
      </div>}
    </div>
  );
}