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
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);

  const handleGenerateQuestions = async (generateMore: boolean = false) => {
    if (!jobUrl.trim()) {
      setError('Please enter a job URL');
      return;
    }

    if (generateMore) {
      setIsGeneratingMore(true);
    } else {
      setIsLoading(true);
      setQuestions([]);
    }
    setError(null);

    try {
      // Call HR AI to generate interview questions
      const result = await (window as any).electron.invoke('ai:generate-interview-prep', { 
        jobUrl, 
        userId,
        generateMore 
      });

      if (result.success) {
        if (generateMore) {
          // Append new questions to existing ones
          setQuestions(prev => [...prev, ...(result.questions || [])]);
        } else {
          setQuestions(result.questions || []);
        }
        setJobInfo(result.jobInfo || null);
        setImportantApps(result.importantApps || []);
      } else {
        setError(result.error || 'Failed to generate questions');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsGeneratingMore(false);
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
            onClick={() => handleGenerateQuestions(false)}
            disabled={isLoading || isGeneratingMore}
            style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              cursor: (isLoading || isGeneratingMore) ? 'wait' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              opacity: (isLoading || isGeneratingMore) ? 0.7 : 1,
              minWidth: '180px'
            }}
          >
            {isLoading ? '⏳ Analyzing...' : '🤖 Generate Questions'}
          </button>
          {questions.length > 0 && (
            <button
              onClick={() => handleGenerateQuestions(true)}
              disabled={isLoading || isGeneratingMore}
              style={{
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                cursor: (isLoading || isGeneratingMore) ? 'wait' : 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                opacity: (isLoading || isGeneratingMore) ? 0.7 : 1,
                minWidth: '160px'
              }}
            >
              {isGeneratingMore ? '⏳ Adding...' : '➕ Generate More'}
            </button>
          )}
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

      {/* Social Decorum Section */}
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>🎭</span>
          Interview Etiquette & Social Decorum
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          
          {/* Online Interview Tips */}
          <div style={{ 
            background: 'var(--card-bg)', 
            borderRadius: '12px', 
            padding: '20px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ 
                width: '40px', height: '40px', borderRadius: '10px', 
                background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px'
              }}>💻</span>
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Online Interview Tips</h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.8' }}>
              <li><strong>Test technology</strong> - Check camera, mic, and internet 15 min before</li>
              <li><strong>Background</strong> - Clean, professional, neutral background</li>
              <li><strong>Lighting</strong> - Face a window or use front-facing light</li>
              <li><strong>Eye contact</strong> - Look at the camera, not the screen</li>
              <li><strong>Minimize distractions</strong> - Mute phone, close other apps</li>
              <li><strong>Keep notes nearby</strong> - But don't read directly from them</li>
              <li><strong>Dress code</strong> - Professional from head to toe (you might stand up!)</li>
            </ul>
          </div>

          {/* In-Person Interview Tips */}
          <div style={{ 
            background: 'var(--card-bg)', 
            borderRadius: '12px', 
            padding: '20px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ 
                width: '40px', height: '40px', borderRadius: '10px', 
                background: 'linear-gradient(135deg, #52b788 0%, #2d6a4f 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px'
              }}>🏢</span>
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>In-Person Interview Tips</h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.8' }}>
              <li><strong>Arrive early</strong> - 10-15 minutes before scheduled time</li>
              <li><strong>Bring copies</strong> - CV, references, portfolio (even if sent digitally)</li>
              <li><strong>Greet everyone</strong> - From receptionist to interviewer, be polite</li>
              <li><strong>Firm handshake</strong> - Confident but not crushing</li>
              <li><strong>Sit properly</strong> - Upright, leaning slightly forward shows interest</li>
              <li><strong>Mind your belongings</strong> - Bag on floor, phone on silent</li>
              <li><strong>Thank everyone</strong> - Before leaving, thank each person by name</li>
            </ul>
          </div>

          {/* Body Language */}
          <div style={{ 
            background: 'var(--card-bg)', 
            borderRadius: '12px', 
            padding: '20px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ 
                width: '40px', height: '40px', borderRadius: '10px', 
                background: 'linear-gradient(135deg, #f72585 0%, #b5179e 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px'
              }}>🙋</span>
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Body Language</h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.8' }}>
              <li><strong>Maintain eye contact</strong> - 60-70% of the time, natural breaks are okay</li>
              <li><strong>Smile genuinely</strong> - Shows warmth and confidence</li>
              <li><strong>Open posture</strong> - Avoid crossed arms, lean in slightly</li>
              <li><strong>Nod appropriately</strong> - Shows active listening</li>
              <li><strong>Control nervous habits</strong> - No fidgeting, hair touching, or leg bouncing</li>
              <li><strong>Hand gestures</strong> - Use naturally to emphasize points</li>
              <li><strong>Mirror subtly</strong> - Match interviewer's energy level</li>
            </ul>
          </div>

          {/* Dress Code */}
          <div style={{ 
            background: 'var(--card-bg)', 
            borderRadius: '12px', 
            padding: '20px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ 
                width: '40px', height: '40px', borderRadius: '10px', 
                background: 'linear-gradient(135deg, #ffd60a 0%, #ff9e00 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px'
              }}>👔</span>
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Dress Code Guide</h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.8' }}>
              <li><strong>Research company culture</strong> - Tech startup vs. law firm = different dress</li>
              <li><strong>When in doubt, overdress</strong> - Better too formal than too casual</li>
              <li><strong>Colors</strong> - Navy, gray, black are safe; avoid loud patterns</li>
              <li><strong>Grooming</strong> - Clean, neat hair; trimmed nails; minimal cologne/perfume</li>
              <li><strong>Accessories</strong> - Minimal jewelry, classic watch, professional bag</li>
              <li><strong>Fit matters</strong> - Well-fitted clothes look more professional</li>
              <li><strong>Comfort</strong> - Don't wear something for the first time to an interview</li>
            </ul>
          </div>

          {/* Making a Great Impression */}
          <div style={{ 
            background: 'var(--card-bg)', 
            borderRadius: '12px', 
            padding: '20px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ 
                width: '40px', height: '40px', borderRadius: '10px', 
                background: 'linear-gradient(135deg, #9d4edd 0%, #5a189a 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px'
              }}>⭐</span>
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Making a Great Impression</h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.8' }}>
              <li><strong>Be authentic</strong> - Don't try to be someone you're not</li>
              <li><strong>Show enthusiasm</strong> - Genuine interest in the role and company</li>
              <li><strong>Listen actively</strong> - Don't just wait for your turn to speak</li>
              <li><strong>Ask thoughtful questions</strong> - Shows you've done your research</li>
              <li><strong>Tell stories</strong> - STAR method makes answers memorable</li>
              <li><strong>Be positive</strong> - Never badmouth previous employers</li>
              <li><strong>Follow up</strong> - Send a thank-you email within 24 hours</li>
            </ul>
          </div>

          {/* Communication Tips */}
          <div style={{ 
            background: 'var(--card-bg)', 
            borderRadius: '12px', 
            padding: '20px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ 
                width: '40px', height: '40px', borderRadius: '10px', 
                background: 'linear-gradient(135deg, #3a86ff 0%, #023e8a 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px'
              }}>💬</span>
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Communication Tips</h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.8' }}>
              <li><strong>Speak clearly</strong> - Moderate pace, good enunciation</li>
              <li><strong>Avoid filler words</strong> - "Um", "like", "you know" - pause instead</li>
              <li><strong>Be concise</strong> - Answer in 1-2 minutes, then check if they want more</li>
              <li><strong>Use their language</strong> - Mirror terminology from job description</li>
              <li><strong>Pause before answering</strong> - Shows thoughtfulness</li>
              <li><strong>Ask for clarification</strong> - If unsure about a question, ask</li>
              <li><strong>End strong</strong> - Reiterate interest and fit for the role</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}

export default InterviewInsider;
