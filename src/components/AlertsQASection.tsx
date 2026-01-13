import { useState, useEffect } from 'react';

interface Question {
  id: number;
  question: string;
  answer: string;
  category: string;
  job_id?: number;
  created_at: string;
  updated_at: string;
}

interface PendingQuestion {
  field: string;
  label?: string;
  question: string;
  type: string;
  category?: string;
  options?: string[];
}

interface Props {
  userId: number;
  pendingQuestions?: PendingQuestion[];
  jobId?: number;
  onAnswersSubmit?: (answers: Array<{ field: string; answer: string; saveForLater: boolean }>) => void;
  onCancel?: () => void;
}

export function AlertsQASection({ userId, pendingQuestions, jobId, onAnswersSubmit, onCancel }: Props) {
  const [savedQuestions, setSavedQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, { value: string; save: boolean }>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'saved'>('pending');

  const loadSavedQuestions = async () => {
    const result = await (window as any).electron.invoke('qa:get-all');
    if (result?.success) {
      setSavedQuestions(result.data || []);
    }
  };

  useEffect(() => {
    loadSavedQuestions();
  }, []);

  // Initialize answers when pending questions arrive
  useEffect(() => {
    if (pendingQuestions) {
      const initial: Record<string, { value: string; save: boolean }> = {};
      pendingQuestions.forEach(q => {
        // Try to find existing answer
        const existing = savedQuestions.find(sq => 
          sq.question.toLowerCase() === q.question.toLowerCase() ||
          sq.question.toLowerCase().includes(q.label?.toLowerCase() || '')
        );
        initial[q.field] = { value: existing?.answer || '', save: true };
      });
      setAnswers(initial);
    }
  }, [pendingQuestions, savedQuestions]);

  const handleSubmitAnswers = () => {
    if (!onAnswersSubmit) return;
    
    const formattedAnswers = Object.entries(answers).map(([field, { value, save }]) => ({
      field,
      answer: value,
      saveForLater: save
    }));
    
    onAnswersSubmit(formattedAnswers);
  };

  const handleUpdateSaved = async (questionId: number) => {
    await (window as any).electron.invoke('qa:update', { questionId, answer: editValue });
    setEditingId(null);
    loadSavedQuestions();
  };

  const handleDeleteSaved = async (questionId: number) => {
    if (confirm('Delete this Q&A?')) {
      await (window as any).electron.invoke('qa:delete', questionId);
      loadSavedQuestions();
    }
  };

  const categoryColors: Record<string, { bg: string; text: string }> = {
    salary: { bg: 'var(--success-light)', text: 'var(--success)' },
    visa: { bg: 'var(--warning-light)', text: 'var(--warning)' },
    experience: { bg: 'var(--info-light)', text: 'var(--info)' },
    availability: { bg: '#e8f5e9', text: '#388e3c' },
    education: { bg: '#f3e5f5', text: '#7b1fa2' },
    skills: { bg: '#fff3e0', text: '#ef6c00' },
    personal: { bg: '#e3f2fd', text: '#1565c0' },
    other: { bg: 'var(--bg-tertiary)', text: 'var(--text-secondary)' }
  };

  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        <button 
          onClick={() => setActiveTab('pending')}
          style={{ 
            flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
            background: activeTab === 'pending' ? 'var(--primary)' : 'var(--bg-secondary)',
            color: activeTab === 'pending' ? '#fff' : 'var(--text-primary)',
            fontWeight: activeTab === 'pending' ? 'bold' : 'normal'
          }}
        >
          ❓ Pending Questions {pendingQuestions?.length ? `(${pendingQuestions.length})` : ''}
        </button>
        <button 
          onClick={() => setActiveTab('saved')}
          style={{ 
            flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
            background: activeTab === 'saved' ? 'var(--primary)' : 'var(--bg-secondary)',
            color: activeTab === 'saved' ? '#fff' : 'var(--text-primary)',
            fontWeight: activeTab === 'saved' ? 'bold' : 'normal'
          }}
        >
          💾 Saved Q&A ({savedQuestions.length})
        </button>
      </div>

      <div style={{ padding: '20px', maxHeight: '500px', overflowY: 'auto' }}>
        {/* Pending Questions Tab */}
        {activeTab === 'pending' && (
          <div>
            {pendingQuestions && pendingQuestions.length > 0 ? (
              <>
                <div style={{ background: 'var(--warning-light)', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--warning)' }}>
                    <strong>⚠️ The AI needs your input</strong> to continue the application. 
                    Please answer the questions below.
                  </p>
                </div>

                {pendingQuestions.map((q, index) => (
                  <div key={q.field} style={{ marginBottom: '15px', padding: '15px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '14px' }}>
                        {index + 1}. {q.label || q.question}
                      </label>
                      {q.category && (
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '10px', 
                          fontSize: '10px',
                          background: categoryColors[q.category]?.bg || categoryColors.other.bg,
                          color: categoryColors[q.category]?.text || categoryColors.other.text
                        }}>
                          {q.category}
                        </span>
                      )}
                    </div>
                    
                    {q.options && q.options.length > 0 ? (
                      <select
                        value={answers[q.field]?.value || ''}
                        onChange={e => setAnswers(prev => ({ ...prev, [q.field]: { ...prev[q.field], value: e.target.value } }))}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                      >
                        <option value="">Select an option...</option>
                        {q.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : q.type === 'textarea' ? (
                      <textarea
                        value={answers[q.field]?.value || ''}
                        onChange={e => setAnswers(prev => ({ ...prev, [q.field]: { ...prev[q.field], value: e.target.value } }))}
                        placeholder="Enter your answer..."
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', minHeight: '80px', resize: 'vertical' }}
                      />
                    ) : (
                      <input
                        type={q.type === 'email' ? 'email' : q.type === 'number' ? 'number' : 'text'}
                        value={answers[q.field]?.value || ''}
                        onChange={e => setAnswers(prev => ({ ...prev, [q.field]: { ...prev[q.field], value: e.target.value } }))}
                        placeholder="Enter your answer..."
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                      />
                    )}
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={answers[q.field]?.save ?? true}
                        onChange={e => setAnswers(prev => ({ ...prev, [q.field]: { ...prev[q.field], save: e.target.checked } }))}
                      />
                      Save this answer for future applications
                    </label>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  {onCancel && (
                    <button onClick={onCancel} style={{ padding: '10px 20px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  )}
                  <button 
                    onClick={handleSubmitAnswers}
                    disabled={!Object.values(answers).every(a => a.value.trim())}
                    style={{ padding: '10px 25px', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    ✅ Submit Answers & Continue
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>✓</div>
                <p>No pending questions. The AI has all the information it needs.</p>
              </div>
            )}
          </div>
        )}

        {/* Saved Q&A Tab */}
        {activeTab === 'saved' && (
          <div>
            <div style={{ background: 'var(--info-light)', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--info)' }}>
                <strong>💡 Q&A Database</strong> - These saved answers will be automatically used 
                when similar questions appear in future applications.
              </p>
            </div>

            {savedQuestions.length > 0 ? (
              savedQuestions.map(q => (
                <div key={q.id} style={{ marginBottom: '12px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '10px', 
                          fontSize: '10px',
                          background: categoryColors[q.category]?.bg || categoryColors.other.bg,
                          color: categoryColors[q.category]?.text || categoryColors.other.text
                        }}>
                          {q.category}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          Updated: {new Date(q.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '13px' }}>{q.question}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        onClick={() => { setEditingId(q.id); setEditValue(q.answer); }}
                        style={{ padding: '4px 8px', background: 'var(--info-light)', color: 'var(--info)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteSaved(q.id)}
                        style={{ padding: '4px 8px', background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  {editingId === q.id ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                      />
                      <button onClick={() => handleUpdateSaved(q.id)} style={{ padding: '8px 12px', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', padding: '8px', background: 'var(--card-bg)', borderRadius: '6px' }}>{q.answer}</p>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📝</div>
                <p>No saved Q&A yet. When you answer questions during applications, they'll be saved here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AlertsQASection;
