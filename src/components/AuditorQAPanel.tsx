import { useState, useEffect } from 'react';

interface AuditorQuestion {
  id: string;
  jobId: number;
  question: string;
  criteria: string;
  answer?: 'yes' | 'no' | null;
  timestamp: number;
}

interface AuditorCriteria {
  id: string;
  criteria: string;
  userAnswer: 'yes' | 'no';
  timestamp: number;
}

interface Props {
  userId: number;
  onCriteriaUpdate?: () => void;
}

/**
 * Auditor Q&A Panel - Asks user yes/no questions about job requirements
 * to train the Auditor and avoid incorrect rejections
 * 
 * Example: "Do you speak Turkish?" -> Yes/No
 * This becomes a learned criteria for future job matching
 */
export function AuditorQAPanel({ userId, onCriteriaUpdate }: Props) {
  const [pendingQuestions, setPendingQuestions] = useState<AuditorQuestion[]>([]);
  const [learnedCriteria, setLearnedCriteria] = useState<AuditorCriteria[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  // Load pending questions and learned criteria
  const loadData = async () => {
    try {
      const result = await (window as any).electron.invoke('auditor:get-pending-questions', { userId });
      if (result?.success) {
        setPendingQuestions(result.questions || []);
      }
      
      const criteriaResult = await (window as any).electron.invoke('auditor:get-learned-criteria', { userId });
      if (criteriaResult?.success) {
        setLearnedCriteria(criteriaResult.criteria || []);
      }
    } catch (e) {
      console.error('Error loading auditor data:', e);
    }
  };

  useEffect(() => {
    loadData();
    
    // Listen for new questions from the auditor
    const handleNewQuestion = (_event: any, question: AuditorQuestion) => {
      setPendingQuestions(prev => {
        // Avoid duplicates
        if (prev.some(q => q.criteria === question.criteria)) return prev;
        return [...prev, question];
      });
    };
    
    (window as any).electron?.on?.('auditor:new-question', handleNewQuestion);
    
    return () => {
      (window as any).electron?.removeListener?.('auditor:new-question', handleNewQuestion);
    };
  }, [userId]);

  const handleAnswer = async (question: AuditorQuestion, answer: 'yes' | 'no') => {
    try {
      // Save the answer as a learned criteria
      await (window as any).electron.invoke('auditor:save-criteria', {
        userId,
        questionId: question.id,
        jobId: question.jobId,
        criteria: question.criteria,
        answer,
      });
      
      // Remove from pending
      setPendingQuestions(prev => prev.filter(q => q.id !== question.id));
      
      // Reload learned criteria
      loadData();
      
      // Notify parent to refresh compatibility scores
      onCriteriaUpdate?.();
    } catch (e) {
      console.error('Error saving answer:', e);
    }
  };

  const handleDeleteCriteria = async (criteriaId: string) => {
    if (!confirm('Remove this learned criteria?')) return;
    
    try {
      await (window as any).electron.invoke('auditor:delete-criteria', { criteriaId });
      loadData();
      onCriteriaUpdate?.();
    } catch (e) {
      console.error('Error deleting criteria:', e);
    }
  };

  // Group learned criteria by category
  const groupedCriteria = learnedCriteria.reduce((acc, c) => {
    const category = getCriteriaCategory(c.criteria);
    if (!acc[category]) acc[category] = [];
    acc[category].push(c);
    return acc;
  }, {} as Record<string, AuditorCriteria[]>);

  // Always show the panel so users know the feature exists
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
      border: '1px solid var(--border)'
    }}>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🎯</span>
          Auditor Learning Center
          {pendingQuestions.length > 0 && (
            <span style={{
              background: 'var(--warning)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px'
            }}>
              {pendingQuestions.length} pending
            </span>
          )}
        </h3>
        <button style={{
          background: 'none',
          border: 'none',
          fontSize: '18px',
          cursor: 'pointer',
          color: 'var(--text-secondary)'
        }}>
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '16px' }}>
          {/* Empty State - Show helpful info when no questions/criteria yet */}
          {pendingQuestions.length === 0 && learnedCriteria.length === 0 && (
            <div style={{ 
              background: 'var(--bg-primary)', 
              borderRadius: '8px', 
              padding: '16px',
              textAlign: 'center',
              border: '1px dashed var(--border)'
            }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                🧠 The Auditor will ask you questions when analyzing jobs
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Example: "Do you speak Turkish?" or "Do you have AWS certification?"
                <br />
                Your answers will train the Auditor to make better job matching decisions.
              </p>
            </div>
          )}
          
          {/* Pending Questions - Need User Input */}
          {pendingQuestions.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ 
                margin: '0 0 12px 0', 
                color: 'var(--warning)',
                fontSize: '14px'
              }}>
                Help the Auditor Learn - Answer These Questions:
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingQuestions.map(q => (
                  <div 
                    key={q.id}
                    style={{
                      background: 'var(--bg-primary)',
                      borderRadius: '8px',
                      padding: '12px',
                      border: '1px solid var(--warning)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 500 }}>{q.question}</p>
                      <p style={{ 
                        margin: '4px 0 0 0', 
                        fontSize: '12px', 
                        color: 'var(--text-secondary)' 
                      }}>
                        Criteria: {q.criteria}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleAnswer(q, 'yes')}
                        style={{
                          padding: '8px 20px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'var(--success)',
                          color: 'white',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Yes
                      </button>
                      <button
                        onClick={() => handleAnswer(q, 'no')}
                        style={{
                          padding: '8px 20px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'var(--error)',
                          color: 'white',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ✗ No
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learned Criteria */}
          {learnedCriteria.length > 0 && (
            <div>
              <h4 style={{ 
                margin: '0 0 12px 0', 
                fontSize: '14px',
                color: 'var(--text-secondary)'
              }}>
                Learned Criteria ({learnedCriteria.length}):
              </h4>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.entries(groupedCriteria).map(([category, criteria]) => (
                  <div key={category} style={{ width: '100%', marginBottom: '8px' }}>
                    <span style={{ 
                      fontSize: '12px', 
                      color: 'var(--text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {category}
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {criteria.map(c => (
                        <span
                          key={c.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontSize: '13px',
                            background: c.userAnswer === 'yes' ? 'var(--success-light)' : 'var(--error-light)',
                            color: c.userAnswer === 'yes' ? 'var(--success)' : 'var(--error)',
                            border: `1px solid ${c.userAnswer === 'yes' ? 'var(--success)' : 'var(--error)'}40`
                          }}
                        >
                          {c.userAnswer === 'yes' ? '✓' : '✗'} {c.criteria}
                          <button
                            onClick={() => handleDeleteCriteria(c.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              opacity: 0.6,
                              fontSize: '14px'
                            }}
                            title="Remove this criteria"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper to categorize criteria
function getCriteriaCategory(criteria: string): string {
  const lower = criteria.toLowerCase();
  
  if (lower.includes('speak_') || lower.includes('language') || lower.includes('sprache')) {
    return 'Languages';
  }
  if (lower.includes('cert_') || lower.includes('certification') || lower.includes('license') || lower.includes('zertifikat')) {
    return 'Certifications';
  }
  if (lower.includes('tool_') || lower.includes('experience') || lower.includes('erfahrung')) {
    return 'Tools & Experience';
  }
  if (lower.includes('degree') || lower.includes('education') || lower.includes('studium')) {
    return 'Education';
  }
  if (lower.includes('work_permit') || lower.includes('eu_citizen') || lower.includes('security_clearance') || lower.includes('drivers_license') || lower.includes('visa') || lower.includes('arbeitserlaubnis')) {
    return 'Work Authorization';
  }
  if (lower.includes('willing_travel') || lower.includes('willing_relocate') || lower.includes('onsite_ok') || lower.includes('travel') || lower.includes('relocate') || lower.includes('remote')) {
    return 'Location & Travel';
  }
  
  return 'Other';
}

export default AuditorQAPanel;
