import { useState, useEffect } from 'react';

export function ApplicationInbox({ userId }: { userId: number }) {
  const [apps, setApps] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const loadApps = async () => {
    const result = await (window as any).electron.invoke('apps:get-all', userId);
    if (result?.success) {
      // SORTING LOGIC: Pending/Applied at top, Rejections at bottom
      const sorted = [...result.data].sort((a, b) => {
        if (a.status === 'rejected' && b.status !== 'rejected') return 1;
        if (a.status !== 'rejected' && b.status === 'rejected') return -1;
        return new Date(b.applied_date).getTime() - new Date(a.applied_date).getTime();
      });
      setApps(sorted);
    }
  };

  useEffect(() => { loadApps(); const i = setInterval(loadApps, 5000); return () => clearInterval(i); }, [userId]);

  const statusSteps = [
    "Verification Email", "Account Confirmation", "Application Confirmation", 
    "Follow-up Sent", "Follow-up Confirmation", "Follow-up Answer", 
    "Rejection/Acceptance", "Appointment Request", "Appointment Confirmation"
  ];

  const handleManualStatus = async (id: number, status: string) => {
    await (window as any).electron.invoke('apps:update-status', { id, status, needsManualConfirmation: 0 });
    loadApps();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>📬 Application Inbox</h2>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>Follow the conversation between your Secretary AI and HR departments.</p>

      <div style={{ display: 'grid', gap: '15px' }}>
        {apps.map((app, index) => (
          <div key={app.id} style={{ 
            background: app.status === 'rejected' ? '#f9f9f9' : '#fff', 
            border: app.needs_manual_confirmation ? '2px solid #ff9800' : '1px solid #ddd', 
            borderRadius: '12px', padding: '20px', opacity: app.status === 'rejected' ? 0.7 : 1 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <strong style={{ fontSize: '18px' }}>#{index + 1} {app.job_title} at {app.company_name}</strong>
              <span style={{ fontSize: '12px', color: '#999' }}>Status: <strong style={{ color: app.status === 'appointment' ? '#4CAF50' : app.status === 'rejected' ? '#f44336' : '#0077b5' }}>{app.status.toUpperCase()}</strong></span>
            </div>
            
            <div style={{ fontSize: '13px', color: '#555', marginBottom: '15px', fontStyle: 'italic' }}>
              💬 Secretary Feedback: {app.secretary_feedback || 'Waiting for response...'}
            </div>

            {app.needs_manual_confirmation === 1 && (
              <div style={{ background: '#fff3e0', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ffe0b2' }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#e65100' }}>
                  🧐 Auditor Note: I found a potential rejection, but there is ambiguity (multiple applications). Please confirm:
                </p>
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleManualStatus(app.id, 'rejected')} style={{ background: '#f44336', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>Confirm Rejection</button>
                  <button onClick={() => handleManualStatus(app.id, 'applied')} style={{ background: '#4CAF50', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>Keep as Applied</button>
                </div>
              </div>
            )}

            <div onClick={() => setSelectedApp(app)} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', cursor: 'pointer', background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
              {statusSteps.map((step, i) => {
                const isDone = app.events?.some((e: any) => e.type === step);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: isDone ? '#4CAF50' : '#eee', color: isDone ? '#fff' : '#999' }}>{step}</span>
                    {i < statusSteps.length - 1 && <span style={{ color: '#ccc' }}>›</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* EMAIL CONVERSATION POPUP */}
      {selectedApp && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', maxWidth: '800px', width: '90%', maxHeight: '80%', overflowY: 'auto' }}>
            <button onClick={() => setSelectedApp(null)} style={{ float: 'right', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            <h3>📧 Conversation: {selectedApp.company_name}</h3>
            {selectedApp.events?.map((event: any, i: number) => (
              <div key={i} style={{ marginBottom: '20px', padding: '15px', background: event.from === 'Secretary' ? '#e3f2fd' : '#f5f5f5', borderRadius: '10px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{event.from} - {new Date(event.date).toLocaleString()}</div>
                <div style={{ marginTop: '5px', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{event.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}