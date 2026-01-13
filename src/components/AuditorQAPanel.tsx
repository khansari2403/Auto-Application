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
 * Features:
 * - Pending questions with Yes/No buttons (selected answer is bold)
 * - Archive section for answered questions
 * - Green/Red boxes for learned criteria
 */
export function AuditorQAPanel({ userId, onCriteriaUpdate }: Props) {
  const [pendingQuestions, setPendingQuestions] = useState<AuditorQuestion[]>([]);
  const [learnedCriteria, setLearnedCriteria] = useState<AuditorCriteria[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<Array<{question: AuditorQuestion; answer: 'yes' | 'no'}>>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

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

      const archiveResult = await (window as any).electron.invoke('auditor:get-answered-questions', { userId });
      if (archiveResult?.success) {
        setAnsweredQuestions(archiveResult.answered || []);
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
      
      // Move to answered questions archive
      setAnsweredQuestions(prev => [...prev, { question, answer }]);
      
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

  const handleToggleAnswer = async (criteria: AuditorCriteria) => {
    const newAnswer = criteria.userAnswer === 'yes' ? 'no' : 'yes';
    try {
      await (window as any).electron.invoke('auditor:update-criteria', {
        criteriaId: criteria.id,
        newAnswer
      });
      loadData();
      onCriteriaUpdate?.();
    } catch (err) {
      console.error('Error updating criteria:', err);
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

  // Separate criteria into Yes and No groups
  const yesCriteria = Array.from(new Map(learnedCriteria.filter(c => (c.userAnswer === 'yes' || (c as any).user_answer === 'yes')).map(c => [c.criteria, c])).values());
  const noCriteria = Array.from(new Map(learnedCriteria.filter(c => (c.userAnswer === 'no' || (c as any).user_answer === 'no')).map(c => [c.criteria, c])).values());

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px',
      border: '1px solid var(--border)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    }}>
      {/* Header */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: isExpanded ? '20px' : '0'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 style={{ 
          margin: 0, 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--text-primary)'
        }}>
          <span style={{ fontSize: '24px' }}>🎯</span>
          Auditor Learning Center
          {pendingQuestions.length > 0 && (
            <span style={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600
            }}>
              {pendingQuestions.length} pending
            </span>
          )}
        </h3>
        <button style={{
          background: 'var(--bg-tertiary)',
          border: 'none',
          fontSize: '14px',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          padding: '8px 12px',
          borderRadius: '8px'
        }}>
          {isExpanded ? '▲ Collapse' : '▼ Expand'}
        </button>
      </div>

      {isExpanded && (
        <div>
          {/* Empty State */}
          {pendingQuestions.length === 0 && learnedCriteria.length === 0 && answeredQuestions.length === 0 && (
            <div style={{ 
              background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)', 
              borderRadius: '12px', 
              padding: '24px',
              textAlign: 'center',
              border: '2px dashed var(--border)'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧠</div>
              <p style={{ margin: '0 0 8px 0', fontSize: '15px', color: 'var(--text-primary)', fontWeight: 500 }}>
                The Auditor will ask you questions when analyzing jobs
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Example: "Do you speak Turkish?" or "Do you have AWS certification?"
                <br />
                Your answers train the Auditor to make better job matching decisions.
              </p>
            </div>
          )}
          
          {/* Pending Questions Section */}
          {pendingQuestions.length > 0 && (
            <div style={{ 
              marginBottom: '24px',
              background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
              borderRadius: '12px',
              padding: '20px',
              border: '2px solid #ffb74d'
            }}>
              <h4 style={{ 
                margin: '0 0 16px 0', 
                color: '#e65100',
                fontSize: '15px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>❓</span>
                Help the Auditor Learn - Answer These Questions:
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingQuestions.map(q => (
                  <QuestionCard 
                    key={q.id} 
                    question={q} 
                    onAnswer={handleAnswer}
                    selectedAnswer={null}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Archive Section - Recently Answered */}
          {answeredQuestions.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <button
                onClick={() => setShowArchive(!showArchive)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}
              >
                <span>📁 Archive - Recently Answered ({answeredQuestions.length})</span>
                <span>{showArchive ? '▲' : '▼'}</span>
              </button>
              
              {showArchive && (
                <div style={{
                  marginTop: '12px',
                  background: 'var(--bg-primary)',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid var(--border)'
                }}>
                  {answeredQuestions.map((item, idx) => (
                    <div 
                      key={idx}
                      style={{
                        padding: '12px',
                        marginBottom: idx < answeredQuestions.length - 1 ? '8px' : 0,
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>
                          {item.question.question}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                        <span style={{
                          padding: '6px 16px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: item.answer === 'yes' ? 700 : 400,
                          background: item.answer === 'yes' ? '#4CAF50' : 'transparent',
                          color: item.answer === 'yes' ? 'white' : '#ccc',
                          border: item.answer === 'yes' ? 'none' : '1px solid #ddd'
                        }}>
                          ✓ Yes
                        </span>
                        <span style={{
                          padding: '6px 16px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: item.answer === 'no' ? 700 : 400,
                          background: item.answer === 'no' ? '#f44336' : 'transparent',
                          color: item.answer === 'no' ? 'white' : '#ccc',
                          border: item.answer === 'no' ? 'none' : '1px solid #ddd'
                        }}>
                          ✗ No
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Learned Criteria - Two Box Layout */}
          {learnedCriteria.length > 0 && (
            <div>
              <h4 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '18px' }}>📚</span>
                Your Learned Criteria ({learnedCriteria.length})
              </h4>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '16px'
              }}>
                {/* GREEN BOX - Yes Answers */}
                <div style={{
                  background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '2px solid #4CAF50',
                  minHeight: '120px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid rgba(76, 175, 80, 0.3)'
                  }}>
                    <span style={{
                      background: '#4CAF50',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}>
                      ✓ YES
                    </span>
                    <span style={{ color: '#2E7D32', fontSize: '13px', fontWeight: 500 }}>
                      Skills You Have ({yesCriteria.length})
                    </span>
                  </div>
                  
                  {yesCriteria.length === 0 ? (
                    <p style={{ 
                      margin: 0, 
                      color: '#66BB6A', 
                      fontSize: '13px',
                      fontStyle: 'italic',
                      textAlign: 'center',
                      padding: '20px 0'
                    }}>
                      No "Yes" criteria yet
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {yesCriteria.map(c => (
                        <CriteriaBubble 
                          key={c.id} 
                          criteria={c} 
                          onToggle={() => handleToggleAnswer(c)}
                          onDelete={() => handleDeleteCriteria(c.id)}
                          isYes={true}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* RED BOX - No Answers */}
                <div style={{
                  background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '2px solid #f44336',
                  minHeight: '120px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid rgba(244, 67, 54, 0.3)'
                  }}>
                    <span style={{
                      background: '#f44336',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}>
                      ✗ NO
                    </span>
                    <span style={{ color: '#c62828', fontSize: '13px', fontWeight: 500 }}>
                      Skills You Don't Have ({noCriteria.length})
                    </span>
                  </div>
                  
                  {noCriteria.length === 0 ? (
                    <p style={{ 
                      margin: 0, 
                      color: '#EF5350', 
                      fontSize: '13px',
                      fontStyle: 'italic',
                      textAlign: 'center',
                      padding: '20px 0'
                    }}>
                      No "No" criteria yet
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {noCriteria.map(c => (
                        <CriteriaBubble 
                          key={c.id} 
                          criteria={c} 
                          onToggle={() => handleToggleAnswer(c)}
                          onDelete={() => handleDeleteCriteria(c.id)}
                          isYes={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Help Text */}
              <p style={{
                margin: '12px 0 0 0',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                textAlign: 'center'
              }}>
                💡 Click 🔄 to switch between Yes/No. Click ✕ to remove.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Question Card Component with selection state
function QuestionCard({ 
  question, 
  onAnswer,
  selectedAnswer 
}: { 
  question: AuditorQuestion; 
  onAnswer: (q: AuditorQuestion, answer: 'yes' | 'no') => void;
  selectedAnswer: 'yes' | 'no' | null;
}) {
  const [hoveredAnswer, setHoveredAnswer] = useState<'yes' | 'no' | null>(null);
  
  return (
    <div 
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #ffcc80',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 2px 8px rgba(255, 152, 0, 0.15)'
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ 
          margin: 0, 
          fontWeight: 600, 
          fontSize: '15px',
          color: '#333'
        }}>
          {question.question}
        </p>
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => onAnswer(question, 'yes')}
          onMouseEnter={() => setHoveredAnswer('yes')}
          onMouseLeave={() => setHoveredAnswer(null)}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: selectedAnswer === 'yes' || hoveredAnswer === 'yes' ? 'none' : '2px solid #4CAF50',
            background: selectedAnswer === 'yes' || hoveredAnswer === 'yes' 
              ? 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)' 
              : 'white',
            color: selectedAnswer === 'yes' || hoveredAnswer === 'yes' ? 'white' : '#4CAF50',
            fontWeight: selectedAnswer === 'yes' ? 800 : 600,
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease',
            boxShadow: selectedAnswer === 'yes' || hoveredAnswer === 'yes' 
              ? '0 2px 8px rgba(76, 175, 80, 0.3)' 
              : 'none'
          }}
        >
          ✓ Yes
        </button>
        <button
          onClick={() => onAnswer(question, 'no')}
          onMouseEnter={() => setHoveredAnswer('no')}
          onMouseLeave={() => setHoveredAnswer(null)}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: selectedAnswer === 'no' || hoveredAnswer === 'no' ? 'none' : '2px solid #f44336',
            background: selectedAnswer === 'no' || hoveredAnswer === 'no' 
              ? 'linear-gradient(135deg, #f44336 0%, #c62828 100%)' 
              : 'white',
            color: selectedAnswer === 'no' || hoveredAnswer === 'no' ? 'white' : '#f44336',
            fontWeight: selectedAnswer === 'no' ? 800 : 600,
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease',
            boxShadow: selectedAnswer === 'no' || hoveredAnswer === 'no' 
              ? '0 2px 8px rgba(244, 67, 54, 0.3)' 
              : 'none'
          }}
        >
          ✗ No
        </button>
      </div>
    </div>
  );
}

// Criteria Bubble Component
function CriteriaBubble({ 
  criteria, 
  onToggle, 
  onDelete,
  isYes
}: { 
  criteria: AuditorCriteria; 
  onToggle: () => void; 
  onDelete: () => void;
  isYes: boolean;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 500,
        background: 'white',
        color: isYes ? '#2E7D32' : '#c62828',
        border: `1px solid ${isYes ? '#4CAF50' : '#f44336'}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        cursor: 'default'
      }}
    >
      <span style={{ fontSize: '14px' }}>{isYes ? '✓' : '✗'}</span>
      <span>{formatCriteriaForDisplay(criteria.criteria)}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={{
          background: 'none',
          border: 'none',
          padding: '2px 4px',
          cursor: 'pointer',
          opacity: 0.6,
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          color: isYes ? '#2E7D32' : '#c62828'
        }}
        title={`Change to ${isYes ? 'No' : 'Yes'}`}
      >
        🔄
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        style={{
          background: 'none',
          border: 'none',
          padding: '2px',
          cursor: 'pointer',
          opacity: 0.6,
          fontSize: '16px',
          lineHeight: 1,
          color: '#999'
        }}
        title="Remove this criteria"
      >
        ×
      </button>
    </span>
  );
}

// Helper to format criteria for human readability
function formatCriteriaForDisplay(criteria: string): string {
  // Remove prefixes like "speak_", "tool_", "cert_", etc.
  let formatted = criteria.replace(/^(speak_|tool_|cert_|onsite_|willing_|eu_|work_permit_)/i, '');
  
  // Replace underscores with spaces
  formatted = formatted.replace(/_/g, ' ');
  
  // Capitalize first letter of each word
  formatted = formatted.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  return formatted;
}

export default AuditorQAPanel;
