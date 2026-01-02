import { useState, useEffect } from 'react';

interface InterviewQuestion {
  id: string;
  category: 'get_to_know' | 'psychological' | 'aptitude' | 'culture' | 'position_specific';
  question: string;
  suggestedAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tips?: string;
}

interface Props {
  userId: number;
}

const QUESTION_CATEGORIES = [
  { id: 'get_to_know', label: 'Get to Know You', icon: '👋', description: 'Personal background and career goals' },
  { id: 'psychological', label: 'Psychological', icon: '🧠', description: 'Behavioral and situational questions' },
  { id: 'aptitude', label: 'Aptitude', icon: '📊', description: 'Problem-solving and analytical skills' },
  { id: 'culture', label: 'Culture Fit', icon: '🤝', description: 'Values alignment and team dynamics' },
  { id: 'position_specific', label: 'Position Specific', icon: '💼', description: 'Technical skills and role requirements' },
];

export function InterviewInsider({ userId }: Props) {
  const [jobUrl, setJobUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [jobInfo, setJobInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [importantApps, setImportantApps] = useState<string[]>([]);

  const handleGenerateQuestions = async () => {
    if (!jobUrl.trim()) {
      setError('Please enter a job URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setQuestions([]);

    try {
      // Call HR AI to generate interview questions
      const result = await (window as any).electron.invoke('ai:generate-interview-prep', { 
        jobUrl, 
        userId 
      });

      if (result.success) {
        setQuestions(result.questions || []);
        setJobInfo(result.jobInfo || null);
        setImportantApps(result.importantApps || []);
      } else {
        setError(result.error || 'Failed to generate questions');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredQuestions = selectedCategory 
    ? questions.filter(q => q.category === selectedCategory)
    : questions;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'var(--success)';
      case 'medium': return 'var(--warning)';
      case 'hard': return 'var(--danger)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', background: 'var(--bg-primary)', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>🎯</span>
          Interview Insider
        </h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
          Powered by HR AI - Generate tailored interview questions and answers based on the job posting
        </p>
      </div>

      {/* Job URL Input */}
      <div style={{ 
        background: 'var(--card-bg)', 
        padding: '24px', 
        borderRadius: '16px', 
        marginBottom: '24px',
        border: '1px solid var(--border)'
      }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
          🔗 Paste Job Position URL
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://careers.company.com/jobs/backend-developer"
            style={{
              flex: 1,
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
          />
          <button
            onClick={handleGenerateQuestions}
            disabled={isLoading}
            style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              cursor: isLoading ? 'wait' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              opacity: isLoading ? 0.7 : 1,
              minWidth: '180px'
            }}
          >
            {isLoading ? '⏳ Analyzing...' : '🤖 Generate Questions'}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: '12px', padding: '12px', background: 'var(--danger-light)', borderRadius: '8px', color: 'var(--danger)', fontSize: '13px' }}>
            {error}
          </div>
        )}
      </div>

      {/* Job Info & Important Apps */}
      {jobInfo && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '20px', 
          marginBottom: '24px' 
        }}>
          <div style={{ 
            background: 'var(--card-bg)', 
            padding: '20px', 
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '16px' }}>
              📋 Position Summary
            </h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <p><strong>Title:</strong> {jobInfo.title}</p>
              <p><strong>Company:</strong> {jobInfo.company}</p>
              <p><strong>Location:</strong> {jobInfo.location || 'Not specified'}</p>
            </div>
          </div>

          {importantApps.length > 0 && (
            <div style={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
              padding: '20px', 
              borderRadius: '12px',
              color: '#fff'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚡ Important Tools & Technologies
              </h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', opacity: 0.9 }}>
                Based on the job description, you should be familiar with:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {importantApps.map((app, i) => (
                  <span 
                    key={i}
                    style={{ 
                      background: 'rgba(255,255,255,0.2)', 
                      padding: '6px 14px', 
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: 500
                    }}
                  >
                    {app}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Filter */}
      {questions.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedCategory(null)}
              style={{
                padding: '10px 18px',
                borderRadius: '20px',
                border: `2px solid ${!selectedCategory ? 'var(--primary)' : 'var(--border)'}`,
                background: !selectedCategory ? 'var(--primary-light)' : 'var(--card-bg)',
                color: !selectedCategory ? 'var(--primary)' : 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '13px'
              }}
            >
              All ({questions.length})
            </button>
            {QUESTION_CATEGORIES.map(cat => {
              const count = questions.filter(q => q.category === cat.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '20px',
                    border: `2px solid ${selectedCategory === cat.id ? 'var(--primary)' : 'var(--border)'}`,
                    background: selectedCategory === cat.id ? 'var(--primary-light)' : 'var(--card-bg)',
                    color: selectedCategory === cat.id ? 'var(--primary)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {cat.icon} {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Questions List */}
      {questions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredQuestions.map((q, index) => (
            <div 
              key={q.id}
              style={{ 
                background: 'var(--card-bg)', 
                borderRadius: '12px',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Question Header */}
              <div 
                onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}
                style={{ 
                  padding: '18px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: expandedQuestion === q.id ? 'var(--bg-secondary)' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                  <span style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    background: 'var(--primary-light)', 
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}>
                    {index + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>
                      {q.question}
                    </span>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                      <span style={{ 
                        fontSize: '11px', 
                        padding: '2px 8px', 
                        borderRadius: '10px',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)'
                      }}>
                        {QUESTION_CATEGORIES.find(c => c.id === q.category)?.label}
                      </span>
                      <span style={{ 
                        fontSize: '11px', 
                        padding: '2px 8px', 
                        borderRadius: '10px',
                        background: getDifficultyColor(q.difficulty),
                        color: '#fff'
                      }}>
                        {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '20px', color: 'var(--text-tertiary)', transition: 'transform 0.2s', transform: expandedQuestion === q.id ? 'rotate(180deg)' : 'none' }}>
                  ▼
                </span>
              </div>

              {/* Expanded Answer */}
              {expandedQuestion === q.id && (
                <div style={{ 
                  padding: '20px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg-secondary)'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', color: 'var(--success)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ✅ Suggested Answer
                  </h4>
                  <p style={{ 
                    margin: '0 0 16px 0', 
                    color: 'var(--text-primary)', 
                    fontSize: '14px',
                    lineHeight: '1.7',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {q.suggestedAnswer}
                  </p>
                  
                  {q.tips && (
                    <div style={{ 
                      padding: '14px', 
                      background: 'var(--info-light)', 
                      borderRadius: '8px',
                      borderLeft: '4px solid var(--info)'
                    }}>
                      <h5 style={{ margin: '0 0 6px 0', color: 'var(--info)', fontSize: '13px' }}>
                        💡 Pro Tip
                      </h5>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {q.tips}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && questions.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 40px',
          background: 'var(--card-bg)',
          borderRadius: '16px',
          border: '1px dashed var(--border)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎓</div>
          <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '20px' }}>
            Prepare for Your Interview
          </h3>
          <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '500px', marginInline: 'auto', lineHeight: '1.6' }}>
            Paste a job posting URL above and our HR AI will generate tailored interview questions with suggested answers based on:
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {QUESTION_CATEGORIES.map(cat => (
              <span 
                key={cat.id}
                style={{ 
                  padding: '10px 16px', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {cat.icon} {cat.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* HR AI Info Box */}
      <div style={{ 
        marginTop: '24px',
        padding: '20px', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        color: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span style={{ fontSize: '28px' }}>🤖</span>
          <h3 style={{ margin: 0, fontSize: '18px' }}>About HR AI</h3>
        </div>
        <p style={{ margin: 0, fontSize: '13px', opacity: 0.95, lineHeight: '1.6' }}>
          HR AI is your dedicated interview preparation assistant. It analyzes job postings to identify key requirements, 
          generates position-specific questions, and provides suggested answers tailored to your profile. 
          The compatibility score on the Job Search page shows how well your CV matches each position.
        </p>
      </div>
    </div>
  );
}

export default InterviewInsider;
