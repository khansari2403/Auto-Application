import { useState, useEffect } from 'react';

function ActionLog({ userId }: { userId: number }) {
  const [logs, setLogs] = useState<any[]>([]);

  const loadLogs = async () => {
    const result = await (window as any).electron.invoke('logs:get-recent-actions', userId);
    if (result?.success && Array.isArray(result.data)) {
      // Sort by newest first
      const sorted = [...result.data].sort((a, b) => b.id - a.id);
      setLogs(sorted);
    }
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 3000);
    return () => clearInterval(interval);
  }, [userId]);

  return (
    <div style={{ padding: '20px' }}>
      <h3>📊 Activity History</h3>
      <div style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '15px', borderRadius: '8px', fontFamily: 'monospace', minHeight: '400px' }}>
        {logs.length === 0 ? (
          <p style={{ color: '#666' }}>No activity yet...</p>
        ) : (
          logs.map(log => (
            <div key={log.id} style={{ 
              marginBottom: '10px', 
              paddingBottom: '5px', 
              borderBottom: '1px solid #333',
              borderLeft: `4px solid ${log.status === 'in_progress' ? '#ff9800' : log.success ? '#4CAF50' : '#f44336'}` 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888' }}>
                <span>{log.action_type?.toUpperCase()}</span>
                <span>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</span>
              </div>
              <div style={{ marginTop: '4px', color: '#fff' }}>{log.action_description}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ActionLog;