import { useState, useEffect } from 'react';

export function StorageSettings({ userId }: { userId: number }) {
  const [path, setPath] = useState('');

  useEffect(() => {
    (window as any).electron.invoke('settings:get').then((res: any) => {
      if (res?.success) setPath(res.data.storage_path || '');
    });
  }, []);

  const handleSelect = async () => {
    const selectedPath = await (window as any).electron.invoke('settings:select-directory');
    if (selectedPath) {
      await (window as any).electron.invoke('settings:update', { id: 1, storagePath: selectedPath });
      setPath(selectedPath);
      alert("Storage path updated! All generated CVs will be saved here.");
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h3>💾 Local Storage Configuration</h3>
      <p style={{ color: '#666', fontSize: '14px' }}>Choose the folder on your computer where the app will save all generated CVs, Motivation Letters, and application logs.</p>
      
      <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '12px', border: '1px solid #ddd', marginTop: '20px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>Current Save Directory:</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            readOnly 
            value={path || 'No folder selected...'} 
            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: '#eee' }} 
          />
          <button onClick={handleSelect} style={{ padding: '10px 20px', background: '#0077b5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            📁 Change Folder
          </button>
        </div>
      </div>
    </div>
  );
}