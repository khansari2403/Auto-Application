import { useState, useEffect } from 'react';

export function JobSearch({ userId }: { userId: number }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [timers, setTimers] = useState<{ [key: number]: number }>({});

  const loadData = async () => {
    const jobRes = await (window as any).electron.invoke('jobs:get-all', userId);
    if (jobRes?.success) {
      const sorted = jobRes.data.sort((a: any) => a.needs_user_intervention ? -1 : 1);
      setJobs(sorted);
      
      // Initialize timers for new roadblocks
      sorted.forEach((job: any) => {
        if (job.needs_user_intervention === 1 && timers[job.id] === undefined) {
          setTimers(prev => ({ ...prev, [job.id]: 10 }));
        }
      });
    }
    
    const qRes = await (window as any).electron.invoke('questions:get-all', userId);
    if (qRes?.success) setQuestions(qRes.data);
  };

  useEffect(() => { 
    loadData(); 
    const i = setInterval(loadData, 5000); 
    return () => clearInterval(i); 
  }, [userId]);

  // TIMER LOGIC
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const newTimers = { ...prev };
        Object.keys(newTimers).forEach(id => {
          const jobId = parseInt(id);
          if (newTimers[jobId] > 0) {
            newTimers[jobId] -= 1;
          } else if (newTimers[jobId] === 0) {
            // AUTO-ALLOW when timer hits zero
            handleIntervention(jobId, true);
            delete newTimers[jobId];
          }
        });
        return newTimers;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleApply = async (jobId: number) => {
    setProcessingId(jobId);
    const result = await (window as any).electron.invoke('ai:process-application', jobId, userId);
    setProcessingId(null);
    if (result.success) alert("Application Submitted Successfully!");
    else alert(`Error: ${result.error}`);
  };

  const handleIntervention = async (jobId: number, allowAI: boolean) => {
    await (window as any).electron.invoke('ai:handle-intervention', jobId, userId, allowAI);
    setTimers(prev => {
      const newTimers = { ...prev };
      delete newTimers[jobId];
      return newTimers;
    });
    loadData();
  };

  const answerQuestion = async (id: number, answer: string) => {
    await (window as any).electron.invoke('questions:answer', { id, answer });
    loadData();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      {/* AI QUESTIONS SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #0077b5' }}>
          <h4 style={{ color: '#0077b5', marginTop: 0 }}>🚀 Questions of Hunter AI</h4>
          {questions.filter(q => q.source === 'Hunter').length === 0 ? <p style={{fontSize: '12px', color: '#999'}}>No pending questions.</p> : 
            questions.filter(q => q.source === 'Hunter').map(q => (
              <div key={q.id} style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{q.text}</div>
                <input style={{ width: '100%', padding: '8px', marginTop: '5px' }} onBlur={(e) => answerQuestion(q.id, e.target.value)} placeholder="Type your answer..." />
              </div>
            ))
          }
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #673ab7' }}>
          <h4 style={{ color: '#673ab7', marginTop: 0 }}>📧 Questions of the Secretary</h4>
          {questions.filter(q => q.source === 'Secretary').length === 0 ? <p style={{fontSize: '12px', color: '#999'}}>No pending questions.</p> : 
            questions.filter(q => q.source === 'Secretary').map(q => (
              <div key={q.id} style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{q.text}</div>
                <input style={{ width: '100%', padding: '8px', marginTop: '5px' }} onBlur={(e) => answerQuestion(q.id, e.target.value)} placeholder="Type your answer..." />
              </div>
            ))
          }
        </div>
      </div>

      <h2>🎯 Found Jobs</h2>
      <div style={{ display: 'grid', gap: '15px' }}>
        {jobs.map(job => (
          <div key={job.id} style={{ padding: '20px', background: '#fff', border: job.needs_user_intervention ? '3px solid #e91e63' : '1px solid #eee', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '18px' }}>{job.job_title} at {job.company_name}</strong>
                {job.needs_user_intervention === 1 && (
                  <div style={{ marginTop: '10px', animation: 'flash 1s infinite', color: '#e91e63', fontWeight: 'bold' }}>
                    ⚠️ ROADBLOCK! Auto-allowing AI in {timers[job.id]}s...
                  </div>
                )}
              </div>
              
              {job.needs_user_intervention === 1 ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleIntervention(job.id, true)} style={{ background: '#e91e63', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Allow AI Now</button>
                  <button onClick={() => handleIntervention(job.id, false)} style={{ background: '#eee', border: '1px solid #ccc', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>I'll solve it manually</button>
                </div>
              ) : (
                <button 
                  onClick={() => handleApply(job.id)} 
                  disabled={processingId === job.id}
                  style={{ padding: '12px 25px', background: job.status === 'applied' ? '#999' : '#4CAF50', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {processingId === job.id ? '⏳ Submitting...' : job.status === 'applied' ? '✅ Submitted' : '🚀 Submit Application'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes flash { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }`}</style>
    </div>
  );
}