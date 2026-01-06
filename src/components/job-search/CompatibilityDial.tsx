import React, { useState } from 'react';

interface CompatibilityDialProps {
  score: number | null | undefined;
  size?: 'small' | 'large';
  source?: string; // Which profile source was used for assessment
  missingSkills?: string[]; // Missing qualifications
  matchedSkills?: string[]; // Matched qualifications
  breakdown?: {
    skills: number;
    experience: number;
    education: number;
    location: number;
  };
}

export function CompatibilityDial({ score, size = 'small', source, missingSkills = [], matchedSkills = [], breakdown }: CompatibilityDialProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  // If no score, show N/A
  if (score === null || score === undefined || score === 0) {
    const height = size === 'large' ? 80 : 40;
    const width = size === 'large' ? 20 : 12;
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '4px',
        minWidth: size === 'large' ? '50px' : '35px'
      }}>
        <div style={{ 
          position: 'relative',
          width: `${width}px`, 
          height: `${height}px`, 
          borderRadius: `${width/2}px`,
          background: 'var(--bg-tertiary)',
          border: '1px dashed var(--border)',
          overflow: 'hidden'
        }} />
        <span style={{ 
          fontSize: size === 'large' ? '11px' : '9px', 
          fontWeight: 'bold',
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase'
        }}>
          N/A
        </span>
      </div>
    );
  }

  // score: 0-100, maps to red (0-25), yellow (26-50), green (51-75), gold (76-100)
  const getColor = (s: number) => {
    if (s >= 76) return { color: '#FFD700', label: 'Gold', bg: 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)' };
    if (s >= 51) return { color: '#4CAF50', label: 'Green', bg: 'linear-gradient(180deg, #4CAF50 0%, #2E7D32 100%)' };
    if (s >= 26) return { color: '#FFC107', label: 'Yellow', bg: 'linear-gradient(180deg, #FFC107 0%, #FF9800 100%)' };
    return { color: '#f44336', label: 'Red', bg: 'linear-gradient(180deg, #f44336 0%, #c62828 100%)' };
  };

  const { color, label, bg } = getColor(score);
  const height = size === 'large' ? 80 : 40;
  const width = size === 'large' ? 20 : 12;
  const fillHeight = (score / 100) * height;

  // Build tooltip content
  const getTooltipContent = () => {
    const lines: string[] = [];
    
    // Score info
    lines.push(`Match Score: ${score}% (${label})`);
    
    // Breakdown if available
    if (breakdown) {
      lines.push('');
      lines.push('📊 Score Breakdown:');
      lines.push(`  • Skills: ${breakdown.skills}%`);
      lines.push(`  • Experience: ${breakdown.experience}%`);
      lines.push(`  • Education: ${breakdown.education}%`);
      lines.push(`  • Location: ${breakdown.location}%`);
    }
    
    // Missing skills
    if (missingSkills && missingSkills.length > 0) {
      lines.push('');
      lines.push('❌ Missing Qualifications:');
      missingSkills.slice(0, 5).forEach(skill => {
        lines.push(`  • ${skill}`);
      });
      if (missingSkills.length > 5) {
        lines.push(`  ... and ${missingSkills.length - 5} more`);
      }
    }
    
    // Matched skills
    if (matchedSkills && matchedSkills.length > 0) {
      lines.push('');
      lines.push('✅ Matched Skills:');
      matchedSkills.slice(0, 5).forEach(skill => {
        lines.push(`  • ${skill}`);
      });
      if (matchedSkills.length > 5) {
        lines.push(`  ... and ${matchedSkills.length - 5} more`);
      }
    }
    
    // Source
    if (source) {
      lines.push('');
      lines.push(`📋 Based on: ${source}`);
    }
    
    return lines.join('\n');
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '4px',
        minWidth: size === 'large' ? '50px' : '35px',
        position: 'relative'
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Hover Tooltip - positioned to the right to stay within page */}
      {showTooltip && (
        <div style={{
          position: 'fixed',
          zIndex: 9999,
          padding: '12px',
          background: 'var(--card-bg, #fff)',
          border: `2px solid ${color}`,
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          minWidth: '250px',
          maxWidth: '320px',
          maxHeight: '400px',
          overflowY: 'auto',
          fontSize: '12px',
          lineHeight: '1.5',
          color: 'var(--text-primary, #333)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}>
          {/* Header with color indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '12px',
            paddingBottom: '10px',
            borderBottom: `2px solid ${bg}`
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: bg,
              flexShrink: 0
            }} />
            <span style={{ fontWeight: 'bold', fontSize: '14px', color }}>
              {score}% - {label} Match
            </span>
          </div>
          
          {/* Breakdown section */}
          {breakdown && (
            <div style={{ marginBottom: '12px', padding: '10px', background: 'var(--bg-tertiary, #f5f5f5)', borderRadius: '6px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-secondary, #666)', fontSize: '11px' }}>
                📊 Score Breakdown
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Skills:</span>
                  <span style={{ fontWeight: 'bold', color: breakdown.skills >= 50 ? '#4CAF50' : '#f44336' }}>{breakdown.skills}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Experience:</span>
                  <span style={{ fontWeight: 'bold', color: breakdown.experience >= 50 ? '#4CAF50' : '#f44336' }}>{breakdown.experience}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Education:</span>
                  <span style={{ fontWeight: 'bold', color: breakdown.education >= 50 ? '#4CAF50' : '#f44336' }}>{breakdown.education}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Location:</span>
                  <span style={{ fontWeight: 'bold', color: breakdown.location >= 50 ? '#4CAF50' : '#f44336' }}>{breakdown.location}%</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Missing skills section */}
          {missingSkills && missingSkills.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#f44336', fontSize: '11px' }}>
                ❌ Missing Qualifications ({missingSkills.length})
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#c62828', fontSize: '11px' }}>
                {missingSkills.slice(0, 5).map((skill, i) => (
                  <li key={i} style={{ marginBottom: '3px' }}>{skill}</li>
                ))}
                {missingSkills.length > 5 && (
                  <li style={{ fontStyle: 'italic', opacity: 0.8, color: '#ef5350' }}>
                    ...and {missingSkills.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          )}
          
          {/* Matched skills section */}
          {matchedSkills && matchedSkills.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#4CAF50', fontSize: '11px' }}>
                ✅ Matched Skills ({matchedSkills.length})
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#2e7d32', fontSize: '11px' }}>
                {matchedSkills.slice(0, 4).map((skill, i) => (
                  <li key={i} style={{ marginBottom: '3px' }}>{skill}</li>
                ))}
                {matchedSkills.length > 4 && (
                  <li style={{ fontStyle: 'italic', opacity: 0.8, color: '#66bb6a' }}>
                    ...and {matchedSkills.length - 4} more
                  </li>
                )}
              </ul>
            </div>
          )}
          
          {/* No data message */}
          {(!missingSkills || missingSkills.length === 0) && (!matchedSkills || matchedSkills.length === 0) && !breakdown && (
            <div style={{ padding: '10px', background: 'var(--info-light, #e3f2fd)', borderRadius: '6px', fontSize: '11px', color: 'var(--info, #1976d2)' }}>
              💡 Click "Recalculate" to get detailed skill matching analysis
            </div>
          )}
          
          {/* Source info */}
          {source && (
            <div style={{ 
              marginTop: '8px', 
              paddingTop: '8px', 
              borderTop: '1px solid var(--border, #eee)',
              fontSize: '10px',
              color: 'var(--text-tertiary, #888)'
            }}>
              📋 Based on: {source}
            </div>
          )}
        </div>
      )}
      {/* Vertical Gauge */}
      <div style={{ 
        position: 'relative',
        width: `${width}px`, 
        height: `${height}px`, 
        borderRadius: `${width/2}px`,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {/* Fill */}
        <div style={{ 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${fillHeight}px`,
          background: bg,
          borderRadius: `0 0 ${width/2}px ${width/2}px`,
          transition: 'height 0.5s ease'
        }} />
        
        {/* Color markers on the side */}
        <div style={{ position: 'absolute', right: '-3px', top: '0', width: '3px', height: '25%', background: '#FFD700', borderRadius: '2px' }} />
        <div style={{ position: 'absolute', right: '-3px', top: '25%', width: '3px', height: '25%', background: '#4CAF50', borderRadius: '2px' }} />
        <div style={{ position: 'absolute', right: '-3px', top: '50%', width: '3px', height: '25%', background: '#FFC107', borderRadius: '2px' }} />
        <div style={{ position: 'absolute', right: '-3px', top: '75%', width: '3px', height: '25%', background: '#f44336', borderRadius: '2px' }} />
      </div>
      
      {/* Label */}
      <span style={{ 
        fontSize: size === 'large' ? '11px' : '9px', 
        fontWeight: 'bold',
        color: color,
        textTransform: 'uppercase'
      }}>
        {label}
      </span>
      
      {/* Source indicator (only for large size) */}
      {size === 'large' && source && (
        <span style={{ 
          fontSize: '8px', 
          color: 'var(--text-tertiary)',
          maxWidth: '60px',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {source.replace('All Sources (Combined)', 'All').replace(' Profile', '').replace('Uploaded CV: ', '📄')}
        </span>
      )}
    </div>
  );
}
