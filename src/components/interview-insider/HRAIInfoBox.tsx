import React from 'react';

interface HRAIInfoBoxProps {}

export function HRAIInfoBox({}: HRAIInfoBoxProps) {
  return (
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
  );
}
