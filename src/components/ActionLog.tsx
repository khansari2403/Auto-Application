import { useState, useEffect } from 'react';

function ActionLog({ userId }: { userId: number }) {
  const [logs, setLogs] = useState<any[]>([]);

  const loadLogs = async () => {
    const result = await (window as any).electron.invoke('logs:get-recent-actions', userId);
    if (result?.success && Array.isArray(result.data)) {
      const sorted = [...result.data].sort((a, b) => b.id - a.id);
      setLogs(sorted);
    }
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 2000);
    return () => clearInterval(interval);
  }, [userId]);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3>📊 Real-Time Activity History</h3>
        <button onClick={async () => { if(confirm("Clear history?")) { await (window as any).electron.invoke('logs:clear', userId); loadLogs(); } }} 
          style={{ padding: '5px 15px', color: '#f44336', border: '1px solid #f44336', background: 'none', borderRadius: '4px' }}>🗑️ Clear History</button>
      </div>
      <div style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', minHeight: '500px', overflowY: 'auto' }}>
        {logs.length === 0 ? <p style={{ textAlign: 'center', marginTop: '100px' }}>No activity yet.</p> : 
          logs.map(log => (
            <div key={log.id} style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #333', borderLeft: `4px solid ${log.status === 'completed' ? '#4CAF50' : '#ff9800'}`, paddingLeft: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888' }}>
                <span>{log.action_type?.toUpperCase()}</span>
                <span>{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</span>
              </div>
              <div style={{ color: '#fff', fontSize: '14px' }}>{log.action_description}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

export default ActionLog;