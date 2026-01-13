import React from 'react';

export function InterviewEtiquette() {
  return (
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
  );
}
