import { useState, useEffect } from 'react';
import { 
  QUESTION_CATEGORIES, 
  InterviewQuestion, 
  getDifficultyColor,
  InterviewEtiquette,
  HRAIInfoBox 
} from './interview-insider';

interface Props {
  userId: number;
}

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
  
  // Custom question state
  const [customQuestion, setCustomQuestion] = useState('');
  const [customAnswer, setCustomAnswer] = useState<{ question: string; answer: string; tips: string } | null>(null);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);

  // Ask about CV feature state
  const [cvQuestions, setCvQuestions] = useState<{ question: string; answer: string; difficulty: string }[]>([]);
  const [isAskingCv, setIsAskingCv] = useState(false);
  const [difficultyLevel, setDifficultyLevel] = useState(5); // 1-10 scale
  const [showCvSection, setShowCvSection] = useState(false);
  const [cvQuestionsCount, setCvQuestionsCount] = useState(0); // Track how many CV questions generated

  const handleAskAboutCv = async (generateMore: boolean = false) => {
    // Max 5 questions per generation
    const MAX_QUESTIONS = 5;
    
    setIsAskingCv(true);
    setError(null);

    try {
      const result = await (window as any).electron.invoke('ai:ask-about-cv', {
        jobUrl,
        userId,
        difficultyLevel,
        generateMore,
        maxQuestions: MAX_QUESTIONS
      });

      if (result.success) {
        if (generateMore) {
          // Append new questions
          setCvQuestions(prev => [...prev, ...(result.questions || [])]);
          setCvQuestionsCount(prev => prev + (result.questions?.length || 0));
        } else {
          // Replace questions
          setCvQuestions(result.questions || []);
          setCvQuestionsCount(result.questions?.length || 0);
        }
      } else {
        setError(result.error || 'Failed to generate CV questions');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred');
    } finally {
      setIsAskingCv(false);
    }
  };

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
      const result = await (window as any).electron.invoke('ai:generate-interview-prep', { 
        jobUrl, 
        userId,
        generateMore 
      });

      if (result.success) {
        if (generateMore) {
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

  const handleAskQuestion = async () => {
    if (!customQuestion.trim()) {
      setError('Please enter your question');
      return;
    }

    setIsAskingQuestion(true);
    setError(null);
    setCustomAnswer(null);

    try {
      const result = await (window as any).electron.invoke('ai:ask-custom-question', {
        question: customQuestion,
        jobUrl,
        userId
      });

      if (result.success) {
        setCustomAnswer({
          question: customQuestion,
          answer: result.answer,
          tips: result.tips
        });
      } else {
        setError(result.error || 'Failed to get answer');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred');
    } finally {
      setIsAskingQuestion(false);
    }
  };

  const filteredQuestions = selectedCategory 
    ? questions.filter(q => q.category === selectedCategory)
    : questions;

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

      {/* Ask About My CV Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)', 
        padding: '24px', 
        borderRadius: '16px', 
        marginBottom: '24px',
        border: '2px solid #ff6b6b'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: '#333', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>📄</span>
              Ask About My CV
            </h3>
            <p style={{ margin: 0, color: '#666', fontSize: '13px' }}>
              HR AI will grill you with questions based on your CV and the job requirements
            </p>
          </div>
          <button
            onClick={() => setShowCvSection(!showCvSection)}
            style={{
              padding: '8px 16px',
              background: showCvSection ? '#ff6b6b' : 'rgba(255,255,255,0.9)',
              color: showCvSection ? '#fff' : '#ff6b6b',
              border: '2px solid #ff6b6b',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px'
            }}
          >
            {showCvSection ? '▲ Hide' : '▼ Expand'}
          </button>
        </div>

        {showCvSection && (
          <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: '12px', padding: '20px' }}>
            {/* Difficulty Dial */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, color: '#333', fontSize: '14px' }}>
                🔥 Difficulty Level: <span style={{ color: difficultyLevel <= 3 ? '#4CAF50' : difficultyLevel <= 6 ? '#FF9800' : '#f44336' }}>
                  {difficultyLevel <= 3 ? 'Easy' : difficultyLevel <= 6 ? 'Medium' : difficultyLevel <= 8 ? 'Hard' : 'Extreme'}
                </span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>😊</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={difficultyLevel}
                  onChange={(e) => setDifficultyLevel(parseInt(e.target.value))}
                  style={{ flex: 1, height: '8px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12px', color: '#666' }}>🔥</span>
                <span style={{ 
                  padding: '4px 12px', 
                  background: difficultyLevel <= 3 ? '#4CAF50' : difficultyLevel <= 6 ? '#FF9800' : '#f44336',
                  color: '#fff',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  minWidth: '30px',
                  textAlign: 'center'
                }}>
                  {difficultyLevel}
                </span>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#888' }}>
                Higher difficulty = tougher questions that probe deeper into your experience gaps
              </p>
            </div>

            <button
              onClick={handleAskAboutCv}
              disabled={isAskingCv || !jobUrl.trim()}
              style={{
                width: '100%',
                padding: '14px 28px',
                background: isAskingCv ? '#ccc' : 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                cursor: (isAskingCv || !jobUrl.trim()) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                marginBottom: '16px'
              }}
            >
              {isAskingCv ? '⏳ Generating Questions...' : '🎤 Grill Me Based on Job + CV'}
            </button>

            {!jobUrl.trim() && (
              <p style={{ margin: 0, fontSize: '12px', color: '#ff6b6b', textAlign: 'center' }}>
                ⚠️ Please enter a Job URL above first
              </p>
            )}

            {/* CV Questions Display */}
            {cvQuestions.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>
                    📋 {cvQuestions.length} Questions Based on Your CV & This Job:
                  </h4>
                  <button
                    onClick={() => handleAskAboutCv(true)}
                    disabled={isAskingCv}
                    style={{
                      padding: '6px 14px',
                      background: isAskingCv ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: isAskingCv ? 'not-allowed' : 'pointer',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isAskingCv ? '⏳ Generating...' : '➕ Generate 5 More'}
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: '#888', margin: '0 0 12px 0' }}>
                  💡 Each click generates up to 5 new questions. Total generated: {cvQuestions.length}
                </p>
                {cvQuestions.map((q, i) => (
                  <div 
                    key={i}
                    style={{ 
                      background: '#fff', 
                      borderRadius: '10px', 
                      padding: '16px', 
                      marginBottom: '12px',
                      border: '1px solid #eee',
                      borderLeft: `4px solid ${q.difficulty === 'hard' ? '#f44336' : q.difficulty === 'medium' ? '#FF9800' : '#4CAF50'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <span style={{ 
                        fontSize: '10px', 
                        padding: '2px 8px', 
                        background: q.difficulty === 'hard' ? '#ffebee' : q.difficulty === 'medium' ? '#fff3e0' : '#e8f5e9',
                        color: q.difficulty === 'hard' ? '#f44336' : q.difficulty === 'medium' ? '#FF9800' : '#4CAF50',
                        borderRadius: '10px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        {q.difficulty}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#333' }}>
                      Q{i + 1}: {q.question}
                    </p>
                    <div style={{ 
                      background: '#f8f9fa', 
                      borderRadius: '8px', 
                      padding: '12px',
                      fontSize: '13px',
                      color: '#555',
                      lineHeight: '1.6'
                    }}>
                      <strong style={{ color: '#4CAF50' }}>💡 Suggested Answer:</strong><br/>
                      {q.answer}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Job Info & Important Apps */}
      {jobInfo && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
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

      {/* Ask Your Question Section */}
      <div style={{ 
        background: 'var(--card-bg)', 
        padding: '24px', 
        borderRadius: '16px', 
        marginBottom: '24px',
        border: '2px solid var(--primary)',
        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.15)'
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>💬</span>
          Ask Your Own Question
        </h3>
        <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Have a specific interview question you're worried about? Type it below and get a personalized answer based on your profile.
        </p>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <input
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
            placeholder="e.g., What is your plan for the next 5 years?"
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
            onClick={handleAskQuestion}
            disabled={isAskingQuestion}
            style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              cursor: isAskingQuestion ? 'wait' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              opacity: isAskingQuestion ? 0.7 : 1,
              minWidth: '140px'
            }}
          >
            {isAskingQuestion ? '⏳ Thinking...' : '💡 Get Answer'}
          </button>
        </div>

        {/* Custom Answer Display */}
        {customAnswer && (
          <div style={{ 
            background: 'var(--bg-secondary)', 
            borderRadius: '12px', 
            padding: '20px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Your Question:</div>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontStyle: 'italic' }}>"{customAnswer.question}"</div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 'bold', marginBottom: '8px' }}>💡 Suggested Answer:</div>
              <div style={{ 
                fontSize: '14px', 
                color: 'var(--text-primary)', 
                lineHeight: '1.7',
                padding: '12px',
                background: 'var(--card-bg)',
                borderRadius: '8px',
                borderLeft: '3px solid var(--success)'
              }}>
                {customAnswer.answer}
              </div>
            </div>
            
            {customAnswer.tips && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--info)', fontWeight: 'bold', marginBottom: '8px' }}>📝 Tips:</div>
                <div style={{ 
                  fontSize: '13px', 
                  color: 'var(--text-secondary)', 
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {customAnswer.tips}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category Filter */}
      {questions.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedCategory(null)}
              style={{
                padding: '10px 20px',
                borderRadius: '25px',
                border: 'none',
                background: !selectedCategory ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'var(--bg-tertiary)',
                color: !selectedCategory ? '#fff' : 'var(--text-secondary)',
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
                    padding: '10px 20px',
                    borderRadius: '25px',
                    border: 'none',
                    background: selectedCategory === cat.id ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'var(--bg-tertiary)',
                    color: selectedCategory === cat.id ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '13px'
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
      {filteredQuestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredQuestions.map((q) => (
            <div 
              key={q.id}
              style={{ 
                background: 'var(--card-bg)', 
                borderRadius: '12px', 
                overflow: 'hidden',
                border: '1px solid var(--border)'
              }}
            >
              <div 
                onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}
                style={{ 
                  padding: '20px', 
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ 
                      background: getDifficultyColor(q.difficulty),
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>
                      {q.difficulty}
                    </span>
                    <span style={{ 
                      background: 'var(--bg-tertiary)',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: 'var(--text-secondary)'
                    }}>
                      {QUESTION_CATEGORIES.find(c => c.id === q.category)?.icon} {QUESTION_CATEGORIES.find(c => c.id === q.category)?.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {q.question}
                  </div>
                </div>
                <span style={{ fontSize: '20px', color: 'var(--text-tertiary)' }}>
                  {expandedQuestion === q.id ? '▲' : '▼'}
                </span>
              </div>

              {expandedQuestion === q.id && (
                <div style={{ 
                  padding: '0 20px 20px 20px',
                  borderTop: '1px solid var(--border)'
                }}>
                  <div style={{ padding: '16px 0' }}>
                    <div style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 'bold', marginBottom: '8px' }}>
                      💡 Suggested Answer:
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: 'var(--text-primary)', 
                      lineHeight: '1.7',
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      borderLeft: '3px solid var(--success)'
                    }}>
                      {q.suggestedAnswer}
                    </div>
                  </div>

                  {q.tips && (
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--info)', fontWeight: 'bold', marginBottom: '8px' }}>
                        📝 Tips:
                      </div>
                      <div style={{ 
                        fontSize: '13px', 
                        color: 'var(--text-secondary)', 
                        lineHeight: '1.6' 
                      }}>
                        {q.tips}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {questions.length === 0 && !isLoading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '48px', 
          background: 'var(--bg-secondary)', 
          borderRadius: '16px',
          border: '2px dashed var(--border)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Ready to Prepare?</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            Paste a job URL above and click "Generate Questions" to get started
          </p>
          <div style={{ marginTop: '20px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {QUESTION_CATEGORIES.map(cat => (
              <span 
                key={cat.id}
                style={{ 
                  padding: '6px 12px', 
                  background: 'var(--card-bg)', 
                  borderRadius: '20px',
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
      <HRAIInfoBox />

      {/* Interview Etiquette Section */}
      <InterviewEtiquette />
    </div>
  );
}

export default InterviewInsider;
